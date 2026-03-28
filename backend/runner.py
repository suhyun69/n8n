#!/usr/bin/env python3
"""
API Flow Tester - CLI Runner

사용법:
  python runner.py flow.json                  # 단일 파일
  python runner.py flow1.json flow2.json      # 복수 파일
  python runner.py flows/                     # 디렉터리 내 *.json 전체
  python runner.py flows/*.json               # glob 패턴
"""

import sys
import json
import re
import asyncio
import time
from pathlib import Path
from typing import Any

import httpx

# ── ANSI 색상 ─────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
GRAY   = "\033[90m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(s):   return f"{GREEN}✓{RESET} {s}"
def fail(s): return f"{RED}✗{RESET} {s}"
def info(s): return f"{CYAN}→{RESET} {s}"
def warn(s): return f"{YELLOW}!{RESET} {s}"


# ── 템플릿 변수 치환 ──────────────────────────────────────────────────
def interpolate(template: str, ctx: dict) -> str:
    def replace(m):
        path = m.group(1).strip().split(".")
        cur = ctx
        for p in path:
            if not isinstance(cur, dict) or p not in cur:
                return ""
            cur = cur[p]
        return str(cur).strip() if cur is not None else ""
    return re.sub(r"\{\{([^}]+)\}\}", replace, template)

def interpolate_obj(obj: Any, ctx: dict) -> Any:
    if isinstance(obj, str):
        return interpolate(obj, ctx)
    if isinstance(obj, list):
        return [interpolate_obj(v, ctx) for v in obj]
    if isinstance(obj, dict):
        return {k: interpolate_obj(v, ctx) for k, v in obj.items()}
    return obj

def get_by_path(obj: Any, path: str) -> Any:
    for key in path.split("."):
        if not isinstance(obj, dict) or key not in obj:
            return None
        obj = obj[key]
    return obj


# ── 위상 정렬 ─────────────────────────────────────────────────────────
def topological_sort(nodes: list, edges: list) -> list:
    in_degree = {n["id"]: 0 for n in nodes}
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        adj[e["source"]].append(e["target"])
        in_degree[e["target"]] += 1

    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    ordered = []
    while queue:
        nid = queue.pop(0)
        node = next((n for n in nodes if n["id"] == nid), None)
        if node:
            ordered.append(node)
        for nxt in adj[nid]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)
    return ordered


# ── Assertion 검사 ────────────────────────────────────────────────────
def check_assertions(assertions: list, status: int, data: Any) -> list[dict]:
    results = []
    for a in assertions:
        if not a.get("enabled", True):
            continue
        actual = status if a["type"] == "status" else get_by_path(data, a.get("jsonPath", ""))
        expected = a.get("expected", "")
        op = a.get("operator", "eq")

        try:
            num = float(expected)
            exp_val = num if expected else expected
        except (ValueError, TypeError):
            exp_val = expected

        passed = False
        if op == "eq":       passed = str(actual) == str(expected) or actual == exp_val
        elif op == "neq":    passed = str(actual) != str(expected)
        elif op == "contains": passed = expected in str(actual)
        elif op == "gt":     passed = float(actual) > float(expected)
        elif op == "lt":     passed = float(actual) < float(expected)
        elif op == "exists": passed = actual is not None

        label = "status" if a["type"] == "status" else a.get("jsonPath", "")
        msg = (
            f"{label} {op} {expected}" if passed
            else f"{label} 기대: {expected}, 실제: {actual}"
        )
        results.append({"passed": passed, "message": msg, "actual": actual})
    return results


# ── 단일 노드 실행 ────────────────────────────────────────────────────
async def execute_node(node: dict, nodes: list, edges: list, ctx: dict, client: httpx.AsyncClient) -> dict:
    ntype = node.get("type")
    data  = node.get("data", {})
    started = time.time()

    if ntype == "startNode":
        return {"status": "skipped"}

    if ntype == "setVariableNode":
        extracted = {}
        for v in data.get("variables", []):
            if not v.get("enabled", True) or not v.get("key"):
                continue
            if v.get("type") == "json":
                try:
                    val = json.loads(v["value"])
                except (json.JSONDecodeError, KeyError):
                    val = v.get("value", "")
            else:
                val = interpolate(v.get("value", ""), ctx)
            ctx["vars"][v["key"]] = val
            extracted[v["key"]] = val
        return {"status": "success", "extractedVars": extracted, "duration": time.time() - started}

    if ntype == "variableExtractNode":
        extracted = {}
        for ex in data.get("extractions", []):
            if not ex.get("variableName") or not ex.get("jsonPath"):
                continue
            source_id = ex.get("sourceNodeId") or _find_prev_http(node["id"], nodes, edges)
            source = ctx["nodes"].get(source_id, {}) if source_id else {}
            value = get_by_path(source, ex["jsonPath"])
            extracted[ex["variableName"]] = value
            ctx["vars"][ex["variableName"]] = value
        return {"status": "success", "extractedVars": extracted, "duration": time.time() - started}

    if ntype == "httpRequestNode":
        method  = data.get("method", "GET").upper()
        url     = interpolate(data.get("url", ""), ctx)
        headers = {
            interpolate(h["key"], ctx): interpolate(h["value"], ctx)
            for h in data.get("headers", [])
            if h.get("enabled", True) and h.get("key")
        }
        params = {
            interpolate(p["key"], ctx): interpolate(p["value"], ctx)
            for p in data.get("queryParams", [])
            if p.get("enabled", True) and p.get("key")
        }

        body_type = data.get("bodyType", "none")
        body_raw  = data.get("body", "")
        req_body  = None
        if body_type != "none" and body_raw:
            interpolated = interpolate(body_raw, ctx)
            if body_type == "json":
                try:
                    req_body = json.loads(interpolated)
                except json.JSONDecodeError:
                    req_body = interpolated
            else:
                req_body = interpolated

        req_info = {"method": method, "url": url, "headers": headers, "body": req_body}

        # 헤더 sanitize
        clean_headers = {
            k.strip(): v.strip().replace("\n","").replace("\r","").replace("\t","")
            for k, v in headers.items() if k.strip() and v.strip()
        }

        try:
            kwargs: dict[str, Any] = {"headers": clean_headers, "params": params, "follow_redirects": True}
            if req_body is not None:
                if body_type == "json":
                    kwargs["json"] = req_body
                else:
                    kwargs["data"] = req_body

            resp = await client.request(method, url, **kwargs)
            try:
                resp_data = resp.json()
            except Exception:
                resp_data = resp.text

            resp_info = {
                "status": resp.status_code,
                "statusText": "",
                "headers": dict(resp.headers),
                "data": resp_data,
            }

            # Assertion 검사
            assertions     = data.get("assertions", [])
            assert_results = check_assertions(assertions, resp.status_code, resp_data)
            failed         = [r for r in assert_results if not r["passed"]]
            assert_failed  = len(failed) > 0
            has_assertions = len(assert_results) > 0
            # assertion 미설정 시 HTTP 상태코드와 무관하게 통과
            http_failed    = has_assertions and resp.status_code >= 400

            final_status = "error" if (assert_failed or http_failed) else "success"
            error_lines  = []
            if http_failed:
                error_lines.append(f"HTTP {resp.status_code}")
            error_lines += [r["message"] for r in failed]

            result = {
                "status": final_status,
                "request": req_info,
                "response": resp_info,
                "assertionResults": assert_results,
                "error": "\n".join(error_lines) if error_lines else None,
                "duration": time.time() - started,
            }
            ctx["nodes"][node["id"]] = result
            return result

        except Exception as e:
            result = {"status": "error", "request": req_info, "error": str(e), "duration": time.time() - started}
            ctx["nodes"][node["id"]] = result
            return result

    return {"status": "skipped"}


def _find_prev_http(node_id: str, nodes: list, edges: list):
    parent_ids = [e["source"] for e in edges if e["target"] == node_id]
    for pid in parent_ids:
        pnode = next((n for n in nodes if n["id"] == pid), None)
        if pnode and pnode.get("type") == "httpRequestNode":
            return pid
        found = _find_prev_http(pid, nodes, edges)
        if found:
            return found
    return None


# ── 플로우 실행 ───────────────────────────────────────────────────────
async def run_flow(flow: dict, flow_name: str) -> bool:
    nodes = flow.get("nodes", [])
    edges = flow.get("edges", [])
    ordered = topological_sort(nodes, edges)
    ctx: dict = {"vars": {}, "nodes": {}}

    print(f"\n{BOLD}{CYAN}{'─'*50}{RESET}")
    print(f"{BOLD}  {flow_name}{RESET}")
    print(f"{CYAN}{'─'*50}{RESET}")

    all_passed = True

    async with httpx.AsyncClient(timeout=30.0) as client:
        for node in ordered:
            ntype = node.get("type")
            label = node.get("data", {}).get("label") or node["id"]

            if ntype == "startNode":
                continue

            result = await execute_node(node, nodes, edges, ctx, client)
            status = result.get("status")
            duration = result.get("duration", 0)
            duration_str = f"{GRAY}({duration*1000:.0f}ms){RESET}"

            if ntype == "setVariableNode":
                extracted = result.get("extractedVars", {})
                print(f"  {ok(f'{BOLD}{label}{RESET}')} {duration_str}")
                for k, v in extracted.items():
                    print(f"      {GRAY}{k} = {v}{RESET}")

            elif ntype == "variableExtractNode":
                extracted = result.get("extractedVars", {})
                print(f"  {ok(f'{BOLD}{label}{RESET}')} {duration_str}")
                for k, v in extracted.items():
                    display = str(v)[:60] + "..." if v and len(str(v)) > 60 else str(v)
                    print(f"      {GRAY}{k} = {display}{RESET}")

            elif ntype == "httpRequestNode":
                req  = result.get("request", {})
                resp = result.get("response", {})
                assertions = result.get("assertionResults", [])
                method = req.get("method", "")
                url    = req.get("url", "")
                code   = resp.get("status", "—") if resp else "—"

                if status == "success":
                    print(f"  {ok(f'{BOLD}{label}{RESET}')}  {GRAY}{method} {url}{RESET}  [{GREEN}{code}{RESET}] {duration_str}")
                else:
                    all_passed = False
                    print(f"  {fail(f'{BOLD}{label}{RESET}')}  {GRAY}{method} {url}{RESET}  [{RED}{code}{RESET}] {duration_str}")
                    if result.get("error"):
                        for line in result["error"].splitlines():
                            print(f"      {RED}{line}{RESET}")

                for ar in assertions:
                    if ar["passed"]:
                        print(f"      {ok(GRAY + ar['message'] + RESET)}")
                    else:
                        print(f"      {fail(RED + ar['message'] + RESET)}")

            if status == "error":
                all_passed = False
                print(f"\n  {warn('플로우가 중단되었습니다.')}\n")
                break

    return all_passed


# ── 엔트리포인트 ──────────────────────────────────────────────────────
async def main():
    args = sys.argv[1:]
    if not args:
        print(f"사용법: python runner.py <flow.json> [flow2.json ...] [dir/]")
        sys.exit(1)

    # 파일 목록 수집
    files: list[Path] = []
    for arg in args:
        p = Path(arg)
        if p.is_dir():
            files.extend(sorted(p.glob("*.json")))
        elif p.exists():
            files.append(p)
        else:
            print(warn(f"파일을 찾을 수 없음: {arg}"))

    if not files:
        print(fail("실행할 플로우 파일이 없습니다."))
        sys.exit(1)

    print(f"\n{BOLD}API Flow Tester — CLI Runner{RESET}")
    print(f"총 {len(files)}개 플로우 실행\n")

    results = {}
    for f in files:
        try:
            flow = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(fail(f"{f.name}: JSON 파싱 실패 — {e}"))
            results[f.name] = False
            continue

        passed = await run_flow(flow, f.name)
        results[f.name] = passed

    # 최종 요약
    print(f"\n{BOLD}{CYAN}{'─'*50}{RESET}")
    print(f"{BOLD}  결과 요약{RESET}")
    print(f"{CYAN}{'─'*50}{RESET}")
    for name, passed in results.items():
        if passed:
            print(f"  {ok(name)}")
        else:
            print(f"  {fail(name)}")

    total   = len(results)
    success = sum(1 for v in results.values() if v)
    failed  = total - success
    print(f"\n  {GREEN}{success} passed{RESET}  {RED}{failed} failed{RESET}  / {total} total\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
