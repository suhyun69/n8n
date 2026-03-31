import axios from 'axios';
import type { Edge } from '@xyflow/react';
import type {
  ExecutionContext,
  NodeExecutionResult,
  HttpRequestNodeData,
  VariableExtractNodeData,
  SetVariableNodeData,
  Assertion,
  AssertionResult,
} from '../types';
import type { FlowNode } from '../store/flowStore';

// ── 템플릿 변수 치환 ────────────────────────────────────────────────
// {{vars.token}}, {{nodes.login.response.data.accessToken}} 등을 실제 값으로 치환
function interpolate(template: string, ctx: ExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.trim().split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = ctx;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    if (current == null) return '';
    // 객체/배열은 JSON 문자열로 직렬화
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current).trim();
  });
}

// ── 객체 내 모든 문자열 값에 interpolate 적용 ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function interpolateObject(obj: any, ctx: ExecutionContext): any {
  if (typeof obj === 'string') return interpolate(obj, ctx);
  if (Array.isArray(obj)) return obj.map((v) => interpolateObject(v, ctx));
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = interpolateObject(v, ctx);
    }
    return result;
  }
  return obj;
}

// ── dot-path로 객체에서 값 추출 ──────────────────────────────────────
// 예: getByPath(obj, "response.data.token")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getByPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// ── Assertion 검사 ────────────────────────────────────────────────────
function checkAssertion(
  assertion: Assertion,
  status: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseData: any
): AssertionResult {
  const actual =
    assertion.type === 'status'
      ? status
      : getByPath(responseData, assertion.jsonPath || '');

  const expected = assertion.expected;

  // 타입 추론: 숫자면 숫자로 비교
  const coerce = (v: unknown): unknown => {
    if (typeof v === 'number') return v;
    const n = Number(expected);
    if (!isNaN(n) && expected !== '') return n;
    return v;
  };

  const actualCoerced = coerce(actual);
  const expectedCoerced = (() => {
    const n = Number(expected);
    return !isNaN(n) && expected !== '' ? n : expected;
  })();

  let passed = false;
  switch (assertion.operator) {
    case 'eq':       passed = actualCoerced == expectedCoerced; break;
    case 'neq':      passed = actualCoerced != expectedCoerced; break;
    case 'contains': passed = String(actual).includes(String(expected)); break;
    case 'gt':       passed = Number(actual) > Number(expected); break;
    case 'lt':       passed = Number(actual) < Number(expected); break;
    case 'exists':   passed = actual !== undefined && actual !== null; break;
  }

  const label =
    assertion.type === 'status'
      ? 'status'
      : assertion.jsonPath || '(경로 없음)';

  const message = passed
    ? `✓ ${label} ${assertion.operator} ${expected}`
    : `✗ ${label} 기대: ${expected}, 실제: ${JSON.stringify(actual)}`;

  return { assertion, passed, actual, message };
}

function runAssertions(
  assertions: Assertion[],
  status: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseData: any
): AssertionResult[] {
  return assertions
    .filter((a) => a.enabled)
    .map((a) => checkAssertion(a, status, responseData));
}

// ── 위상 정렬 ─────────────────────────────────────────────────────────
function topologicalSort(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  }

  for (const e of edges) {
    adjList.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const ordered: FlowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes.find((n) => n.id === id);
    if (node) ordered.push(node);
    for (const next of adjList.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return ordered;
}

// ── 직전 HTTP Request 노드 ID를 찾는 헬퍼 ────────────────────────────
function findPrevHttpNode(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[]
): string | undefined {
  const parentIds = edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);

  for (const pid of parentIds) {
    const pNode = nodes.find((n) => n.id === pid);
    if (pNode?.type === 'httpRequestNode') return pid;
    // 재귀로 더 위로 올라가기
    const found = findPrevHttpNode(pid, nodes, edges);
    if (found) return found;
  }
  return undefined;
}

// ── 단일 노드 실행 ────────────────────────────────────────────────────
async function executeNode(
  node: FlowNode,
  nodes: FlowNode[],
  edges: Edge[],
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  const startedAt = Date.now();

  if (node.type === 'setVariableNode') {
    const d = node.data as SetVariableNodeData;
    for (const v of d.variables || []) {
      if (!v.enabled || !v.key) continue;
      if (v.type === 'json') {
        try {
          ctx.vars[v.key] = JSON.parse(v.value);
        } catch {
          ctx.vars[v.key] = v.value; // 파싱 실패 시 문자열로
        }
      } else {
        ctx.vars[v.key] = interpolate(v.value, ctx);
      }
    }
    return {
      status: 'success',
      startedAt,
      finishedAt: Date.now(),
      extractedVars: Object.fromEntries(
        (d.variables || []).filter((v) => v.enabled && v.key).map((v) => [v.key, ctx.vars[v.key]])
      ),
    };
  }

  if (node.type === 'httpRequestNode') {
    const d = node.data as HttpRequestNodeData;
    const method = d.method || 'GET';
    const url = interpolate(d.url || '', ctx);

    const headers: Record<string, string> = {};
    for (const h of d.headers || []) {
      if (h.enabled && h.key) {
        headers[interpolate(h.key, ctx)] = interpolate(h.value, ctx);
      }
    }

    const params: Record<string, string> = {};
    for (const p of d.queryParams || []) {
      if (p.enabled && p.key) {
        params[interpolate(p.key, ctx)] = interpolate(p.value, ctx);
      }
    }

    let data: unknown = undefined;
    if (d.bodyType !== 'none' && d.body) {
      if (d.bodyType === 'json') {
        try {
          data = JSON.parse(interpolate(d.body, ctx));
        } catch {
          data = interpolate(d.body, ctx);
        }
      } else {
        data = interpolate(d.body, ctx);
      }
    }

    const reqInfo = { method, url, headers, body: data };
    const proxyResponse = await axios.post(
      '/api/proxy',
      { method, url, headers, params, data },
      { validateStatus: () => true }
    );

    const res = proxyResponse.data;
    const responseInfo = {
      status: res.status,
      statusText: res.statusText || '',
      headers: res.headers || {},
      data: res.data,
    };

    // Assertion 검사
    const assertionResults = runAssertions(d.assertions || [], res.status, res.data);
    const failedAssertions = assertionResults.filter((r) => !r.passed);
    const assertionFailed = failedAssertions.length > 0;

    const hasAssertions = assertionResults.length > 0;
    // assertion 있으면 assertion 결과, 없으면 무조건 통과
    const finalStatus = hasAssertions && assertionFailed ? 'error' : 'success';

    const errorMsg = failedAssertions.map((r) => r.message).join('\n') || undefined;

    ctx.nodes[node.id] = {
      status: finalStatus,
      startedAt,
      finishedAt: Date.now(),
      request: reqInfo,
      response: responseInfo,
      assertionResults,
    };

    return {
      status: finalStatus,
      startedAt,
      finishedAt: Date.now(),
      request: reqInfo,
      response: responseInfo,
      error: errorMsg,
      assertionResults,
    };
  }

  if (node.type === 'variableExtractNode') {
    const d = node.data as VariableExtractNodeData;
    const extracted: Record<string, unknown> = {};

    for (const ex of d.extractions || []) {
      if (!ex.variableName || !ex.jsonPath) continue;

      const sourceId = ex.sourceNodeId || findPrevHttpNode(node.id, nodes, edges);
      let sourceResult: unknown;

      if (sourceId && ctx.nodes[sourceId]) {
        sourceResult = ctx.nodes[sourceId];
      } else {
        const lastHttpId = Object.keys(ctx.nodes).reverse().find((id) => {
          const n = nodes.find((nd) => nd.id === id);
          return n?.type === 'httpRequestNode';
        });
        sourceResult = lastHttpId ? ctx.nodes[lastHttpId] : ctx;
      }

      const value = getByPath(sourceResult, ex.jsonPath);
      extracted[ex.variableName] = value;
      ctx.vars[ex.variableName] = value;
    }

    ctx.nodes[node.id] = {
      status: 'success',
      startedAt,
      finishedAt: Date.now(),
      extractedVars: extracted,
    };

    return { status: 'success', startedAt, finishedAt: Date.now(), extractedVars: extracted };
  }

  return { status: 'skipped', startedAt, finishedAt: Date.now() };
}

// ── 메인 엔진 ─────────────────────────────────────────────────────────
export interface EngineCallbacks {
  onNodeStart: (nodeId: string) => void;
  onNodeDone: (nodeId: string, result: NodeExecutionResult) => void;
  onContextUpdate: (ctx: ExecutionContext) => void;
}

export async function runFlow(
  nodes: FlowNode[],
  edges: Edge[],
  callbacks: EngineCallbacks
): Promise<ExecutionContext> {
  const ctx: ExecutionContext = { vars: {}, nodes: {} };
  const ordered = topologicalSort(nodes, edges);

  for (const node of ordered) {
    if (node.type === 'startNode') continue;

    callbacks.onNodeStart(node.id);
    let result: NodeExecutionResult = { status: 'running', startedAt: Date.now() };

    try {
      result = await executeNode(node, nodes, edges, ctx);
    } catch (err: unknown) {
      result = {
        status: 'error',
        startedAt: result.startedAt,
        finishedAt: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      };
    }

    ctx.nodes[node.id] = result;
    callbacks.onNodeDone(node.id, result);
    callbacks.onContextUpdate({ ...ctx });

    if (result.status === 'error') break;
  }

  return ctx;
}

// ── 단일 노드만 실행 (기존 컨텍스트 재사용) ──────────────────────────
export async function runSingleNode(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
  existingCtx: ExecutionContext,
  callbacks: EngineCallbacks
): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.type === 'startNode') return;

  // 기존 컨텍스트를 복사해 사용 (이전 실행 결과의 vars/nodes 그대로 활용)
  const ctx: ExecutionContext = {
    vars: { ...existingCtx.vars },
    nodes: { ...existingCtx.nodes },
  };

  callbacks.onNodeStart(nodeId);

  let result: NodeExecutionResult = { status: 'running', startedAt: Date.now() };
  try {
    result = await executeNode(node, nodes, edges, ctx);
  } catch (err: unknown) {
    result = {
      status: 'error',
      startedAt: result.startedAt,
      finishedAt: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    };
  }

  ctx.nodes[nodeId] = result;
  callbacks.onNodeDone(nodeId, result);
  callbacks.onContextUpdate({ ...ctx });
}
