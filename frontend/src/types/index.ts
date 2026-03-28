export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type NodeType = 'httpRequest' | 'variableExtract' | 'setVariable' | 'start' | 'end';

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  type?: 'string' | 'json';
}

export type AssertionOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists';

export interface Assertion {
  enabled: boolean;
  type: 'status' | 'jsonPath';
  jsonPath?: string;   // type === 'jsonPath' 일 때 경로 (예: data.success)
  operator: AssertionOperator;
  expected: string;    // 기대값 (문자열로 입력, 비교 시 타입 추론)
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual: unknown;
  message: string;
}

export interface HttpRequestNodeData {
  label: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  body: string;
  bodyType: 'json' | 'form' | 'none';
  assertions: Assertion[];
}

export interface VariableExtractNodeData {
  label: string;
  extractions: {
    variableName: string; // 저장할 변수명
    jsonPath: string;     // 예: response.data.token
    sourceNodeId?: string; // 어느 노드 결과에서 추출할지 (없으면 이전 노드)
  }[];
}

export interface SetVariableNodeData {
  label: string;
  variables: KeyValue[];
}

export interface StartNodeData {
  label: string;
}

export interface EndNodeData {
  label: string;
}

export type AnyNodeData =
  | HttpRequestNodeData
  | VariableExtractNodeData
  | SetVariableNodeData
  | StartNodeData
  | EndNodeData;

// 실행 컨텍스트
export interface NodeExecutionResult {
  status: NodeStatus;
  startedAt?: number;
  finishedAt?: number;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
  };
  error?: string;
  extractedVars?: Record<string, unknown>;
  assertionResults?: AssertionResult[];
}

export interface ExecutionContext {
  vars: Record<string, unknown>;
  nodes: Record<string, NodeExecutionResult>;
}
