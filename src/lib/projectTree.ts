import { ProjectTemplate } from "@/types/project";

export interface ProjectTreeNode {
  project: ProjectTemplate;
  depth: number;
  /** Ancestors from root -> this node (names). */
  path: string[];
  children: ProjectTreeNode[];
}

/** Build a nested tree of the user's projects. Root nodes have no parent. */
export function buildProjectTree(projects: ProjectTemplate[]): ProjectTreeNode[] {
  const byId = new Map<string, ProjectTemplate>();
  projects.forEach((p) => byId.set(p.id, p));
  const childrenByParent = new Map<string | null, ProjectTemplate[]>();
  projects.forEach((p) => {
    const key = p.parentId || null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(p);
  });
  // Break any accidental cycles by only including projects reachable from a root.
  const build = (p: ProjectTemplate, depth: number, path: string[]): ProjectTreeNode => {
    const nextPath = [...path, p.name];
    const kids = (childrenByParent.get(p.id) || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    return {
      project: p,
      depth,
      path: nextPath,
      children: kids.map((c) => build(c, depth + 1, nextPath)),
    };
  };
  const roots = (childrenByParent.get(null) || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  return roots.map((r) => build(r, 0, []));
}

/** Flatten a tree in depth-first order. Useful for building tree-select lists. */
export function flattenProjectTree(tree: ProjectTreeNode[]): ProjectTreeNode[] {
  const out: ProjectTreeNode[] = [];
  const walk = (n: ProjectTreeNode) => { out.push(n); n.children.forEach(walk); };
  tree.forEach(walk);
  return out;
}

export function indexProjectNodes(tree: ProjectTreeNode[]): Map<string, ProjectTreeNode> {
  const m = new Map<string, ProjectTreeNode>();
  flattenProjectTree(tree).forEach((n) => m.set(n.project.id, n));
  return m;
}

/** Get the descendants (inclusive) of a project id. */
export function getDescendantIds(nodeIndex: Map<string, ProjectTreeNode>, id: string): string[] {
  const start = nodeIndex.get(id);
  if (!start) return [id];
  const out: string[] = [];
  const walk = (n: ProjectTreeNode) => { out.push(n.project.id); n.children.forEach(walk); };
  walk(start);
  return out;
}

/** Full breadcrumb path like "Work / Q4 / Launch". Falls back to name. */
export function getProjectPath(
  nodeIndex: Map<string, ProjectTreeNode>,
  id: string | null | undefined,
  separator = " / ",
): string {
  if (!id) return "";
  const node = nodeIndex.get(id);
  if (!node) return "";
  return node.path.join(separator);
}

/** Leaf name only — used as the derived "category" label. */
export function getProjectLeafName(
  nodeIndex: Map<string, ProjectTreeNode>,
  id: string | null | undefined,
): string {
  if (!id) return "";
  return nodeIndex.get(id)?.project.name ?? "";
}

/** Ancestor ids (excluding the node itself), root-first. */
export function getAncestorIds(nodeIndex: Map<string, ProjectTreeNode>, id: string): string[] {
  const node = nodeIndex.get(id);
  if (!node) return [];
  // Walk parent chain by looking up parentId on each project.
  const chain: string[] = [];
  let cursor: string | null | undefined = node.project.parentId ?? null;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    chain.unshift(cursor);
    const parent = nodeIndex.get(cursor);
    cursor = parent?.project.parentId ?? null;
  }
  return chain;
}

/** Would setting `candidateParentId` as parent of `nodeId` create a cycle? */
export function wouldCreateCycle(
  nodeIndex: Map<string, ProjectTreeNode>,
  nodeId: string,
  candidateParentId: string | null,
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === nodeId) return true;
  return getDescendantIds(nodeIndex, nodeId).includes(candidateParentId);
}

/** Search across the flattened tree by name or full path. */
export function searchProjectTree(tree: ProjectTreeNode[], q: string): ProjectTreeNode[] {
  const query = q.trim().toLowerCase();
  const flat = flattenProjectTree(tree);
  if (!query) return flat;
  return flat.filter(
    (n) =>
      n.project.name.toLowerCase().includes(query) ||
      n.path.join(" / ").toLowerCase().includes(query),
  );
}