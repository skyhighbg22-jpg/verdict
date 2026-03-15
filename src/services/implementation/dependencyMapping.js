/**
 * Dependency Mapping
 * Generates JSON Dependency Graph with non-LLM script validation
 * Implementation Phase - Malicious QA Engineer requires minimum 3 bugs/errors
 */

import { bytezClient } from '../../api/bytezClient';

export const DEPENDENCY_CONFIG = {
  model: 'claude-opus-4.6',
  minRequiredErrors: 3,
  crossFileValidation: true,
  maxDependencyDepth: 10,
  circularDependencyDetection: true
};

/**
 * Create dependency node
 */
export const createDependencyNode = (id, type, dependencies = [], metadata = {}) => ({
  id,
  type,
  dependencies: Array.isArray(dependencies) ? dependencies : [dependencies],
  dependents: [],
  metadata,
  validated: false,
  validationErrors: []
});

/**
 * Build dependency graph from implementation files
 */
export const buildDependencyGraph = (files, options = {}) => {
  const graph = {
    nodes: new Map(),
    edges: [],
    adjacencyList: new Map(),
    reverseAdjacencyList: new Map(),
    circularDependencies: [],
    orphanNodes: [],
    validationErrors: [],
    generatedAt: new Date().toISOString()
  };

  const fileContents = new Map();
  const importPatterns = [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /require\s*\(['"]([^'"]+)['"]\)/g,
    /import\s*\(['"]([^'"]+)['"]\)/g
  ];

  for (const file of files) {
    const nodeId = file.path || file.name;
    const node = createDependencyNode(nodeId, file.type || 'module', [], {
      path: file.path,
      size: file.content?.length || 0
    });

    graph.nodes.set(nodeId, node);
    graph.adjacencyList.set(nodeId, []);
    graph.reverseAdjacencyList.set(nodeId, []);
    fileContents.set(nodeId, file.content);
  }

  for (const [nodeId, content] of fileContents) {
    const dependencies = extractDependencies(content, importPatterns);
    const node = graph.nodes.get(nodeId);

    for (const dep of dependencies) {
      const resolvedDep = resolveDependencyPath(dep, nodeId, files);
      if (resolvedDep && graph.nodes.has(resolvedDep)) {
        node.dependencies.push(resolvedDep);
        graph.adjacencyList.get(nodeId).push(resolvedDep);
        graph.reverseAdjacencyList.get(resolvedDep).push(nodeId);
        graph.edges.push({ from: nodeId, to: resolvedDep });
      }
    }
  }

  const cycleResult = detectCircularDependencies(graph);
  graph.circularDependencies = cycleResult.cycles;

  graph.orphanNodes = Array.from(graph.nodes.keys())
    .filter(id => graph.adjacencyList.get(id).length === 0 && 
                  graph.reverseAdjacencyList.get(id).length === 0);

  return graph;
};

/**
 * Extract dependencies from file content
 */
const extractDependencies = (content, patterns) => {
  const dependencies = new Set();

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        dependencies.add(match[1]);
      }
    }
  }

  return Array.from(dependencies);
};

/**
 * Resolve relative dependency paths
 */
const resolveDependencyPath = (dep, fromPath, files) => {
  if (dep.startsWith('.') || dep.startsWith('/')) {
    const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/'));
    const resolved = `${fromDir}/${dep}`.replace(/\/+/g, '/');
    
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.json'];
    for (const ext of extensions) {
      const testPath = resolved + ext;
      if (files.some(f => f.path === testPath || f.name === testPath)) {
        return testPath;
      }
    }
    
    const normalized = resolved.replace(/\/\.\//g, '/').replace(/\/[^/]+\/\.\.\//g, '/');
    for (const ext of extensions) {
      const testPath = normalized + ext;
      if (files.some(f => f.path === testPath || f.name === testPath)) {
        return testPath;
      }
    }
  }

  return dep;
};

/**
 * Detect circular dependencies
 */
const detectCircularDependencies = (graph) => {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  const dfs = (nodeId) => {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  };

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return { cycles, hasCycles: cycles.length > 0 };
};

/**
 * Validate all cross-file references (non-LLM script)
 */
export const validateCrossReferences = (graph, files) => {
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
    missingReferences: [],
    unresolvedImports: []
  };

  const functionDefPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(?:export\s+)?(?:async\s+)?function\s+(\w+)|class\s+(\w+))/g;
  const functionCallPattern = /(\w+)\s*\(/g;
  const exportPattern = /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*(\w+)/g;

  const declaredFunctions = new Map();
  const exportedItems = new Map();

  for (const file of files) {
    const fileId = file.path || file.name;
    declaredFunctions.set(fileId, new Set());
    exportedItems.set(fileId, new Set());

    let match;
    const content = file.content || '';
    const funcPattern = new RegExp(functionDefPattern.source, 'g');
    
    while ((match = funcPattern.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[3] || match[4];
      if (funcName) {
        declaredFunctions.get(fileId).add(funcName);
      }
    }

    const expPattern = new RegExp(exportPattern.source, 'g');
    while ((match = expPattern.exec(content)) !== null) {
      if (match[1]) {
        exportedItems.get(fileId).add(match[1]);
      }
    }
  }

  for (const [fileId, imports] of graph.adjacencyList) {
    for (const imported of imports) {
      if (!exportedItems.has(imported)) {
        validationResults.errors.push({
          type: 'missing_import',
          file: fileId,
          import: imported,
          message: `Import "${imported}" in ${fileId} references file that doesn't exist`
        });
        validationResults.unresolvedImports.push({ file: fileId, import: imported });
      }
    }
  }

  for (const [fileId, imported] of graph.adjacencyList) {
    for (const imp of imported) {
      if (!graph.nodes.has(imp)) {
        validationResults.missingReferences.push({
          file: fileId,
          reference: imp
        });
      }
    }
  }

  if (graph.circularDependencies.length > 0) {
    for (const cycle of graph.circularDependencies) {
      validationResults.warnings.push({
        type: 'circular_dependency',
        cycle: cycle,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`
      });
    }
  }

  if (graph.orphanNodes.length > 0) {
    for (const orphan of graph.orphanNodes) {
      validationResults.warnings.push({
        type: 'orphan_node',
        node: orphan,
        message: `Orphan file (no dependencies): ${orphan}`
      });
    }
  }

  validationResults.valid = validationResults.errors.length === 0;

  return validationResults;
};

/**
 * Generate dependency JSON from task graph
 */
export const generateDependencyJSON = (taskGraph) => {
  const dependencyJSON = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    metadata: {
      totalNodes: 0,
      totalEdges: 0,
      maxDepth: 0,
      criticalPath: []
    }
  };

  if (!taskGraph || !taskGraph.tasks) {
    return dependencyJSON;
  }

  const tasks = taskGraph.tasks instanceof Map 
    ? Array.from(taskGraph.tasks.values())
    : taskGraph.tasks;

  for (const task of tasks) {
    dependencyJSON.nodes.push({
      id: task.id,
      title: task.title,
      type: 'task',
      status: task.status,
      priority: task.priority,
      dependencies: task.dependencies || [],
      metadata: {
        description: task.description,
        createdAt: task.createdAt,
        assignedTo: task.assignedTo
      }
    });
  }

  for (const task of tasks) {
    for (const depId of task.dependencies || []) {
      dependencyJSON.edges.push({
        from: depId,
        to: task.id,
        type: 'depends_on'
      });
    }
  }

  dependencyJSON.metadata.totalNodes = dependencyJSON.nodes.length;
  dependencyJSON.metadata.totalEdges = dependencyJSON.edges.length;

  if (taskGraph.metadata?.criticalPath) {
    dependencyJSON.metadata.criticalPath = taskGraph.metadata.criticalPath;
    dependencyJSON.metadata.maxDepth = taskGraph.metadata.criticalPath.length;
  }

  return dependencyJSON;
};

/**
 * Analyze dependencies for the Implementation phase
 */
export const analyzeDependencyGraph = async (graph, options = {}) => {
  const analysis = {
    valid: true,
    issues: [],
    bugs: [],
    recommendations: [],
    statistics: {}
  };

  analysis.statistics = {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.length,
    circularDependencies: graph.circularDependencies.length,
    orphanNodes: graph.orphanNodes.length
  };

  if (graph.circularDependencies.length > 0) {
    analysis.issues.push({
      type: 'circular_dependency',
      severity: 'high',
      count: graph.circularDependencies.length,
      cycles: graph.circularDependencies
    });
    analysis.bugs.push({
      id: generateBugId(),
      type: 'circular_dependency',
      description: `Found ${graph.circularDependencies.length} circular dependency cycle(s)`,
      locations: graph.circularDependencies.map(c => c.join(' -> ')),
      fix: 'Refactor to break circular dependencies using dependency injection or event-based communication'
    });
  }

  if (graph.orphanNodes.length > 0) {
    analysis.issues.push({
      type: 'orphan_files',
      severity: 'medium',
      count: graph.orphanNodes.length,
      nodes: graph.orphanNodes
    });
  }

  const crossRefResult = validateCrossReferences(graph, options.files || []);
  if (!crossRefResult.valid) {
    analysis.valid = false;
    analysis.issues.push({
      type: 'missing_references',
      severity: 'high',
      count: crossRefResult.errors.length
    });
    analysis.bugs.push({
      id: generateBugId(),
      type: 'missing_reference',
      description: `Found ${crossRefResult.errors.length} unresolved import(s)`,
      locations: crossRefResult.errors.map(e => e.file),
      fix: 'Ensure all imported modules exist and are in the correct location'
    });
  }

  if (analysis.bugs.length < DEPENDENCY_CONFIG.minRequiredErrors) {
    const additionalBugs = await findAdditionalBugs(graph, crossRefResult);
    analysis.bugs.push(...additionalBugs);
  }

  for (const warning of crossRefResult.warnings) {
    analysis.recommendations.push({
      type: warning.type,
      message: warning.message
    });
  }

  return analysis;
};

/**
 * Find additional bugs to meet minimum requirement
 */
const findAdditionalBugs = async (graph, validation) => {
  const bugs = [];

  if (graph.orphanNodes.length > 0 && !bugs.some(b => b.type === 'orphan_files')) {
    bugs.push({
      id: generateBugId(),
      type: 'unused_code',
      description: `${graph.orphanNodes.length} file(s) have no dependencies - potential dead code`,
      locations: graph.orphanNodes.slice(0, 3),
      fix: 'Review orphan files and remove if unused, or add necessary imports'
    });
  }

  const deepDependencies = [];
  for (const [nodeId, deps] of graph.adjacencyList) {
    if (deps.length > 5) {
      deepDependencies.push({ file: nodeId, count: deps.length });
    }
  }

  if (deepDependencies.length > 0) {
    bugs.push({
      id: generateBugId(),
      type: 'high_coupling',
      description: `Found ${deepDependencies.length} file(s) with excessive dependencies (>5)`,
      locations: deepDependencies.map(d => `${d.file} (${d.count} deps)`),
      fix: 'Consider refactoring to reduce coupling - split large files or use dependency injection'
    });
  }

  const noDependents = [];
  for (const [nodeId, dependents] of graph.reverseAdjacencyList) {
    if (dependents.length === 0 && !graph.orphanNodes.includes(nodeId)) {
      noDependents.push(nodeId);
    }
  }

  if (noDependents.length > 0) {
    bugs.push({
      id: generateBugId(),
      type: 'entry_point_check',
      description: `${noDependents.length} file(s) are imported but never used`,
      locations: noDependents.slice(0, 5),
      fix: 'Remove unused imports and consider removing unused exported functions'
    });
  }

  return bugs;
};

let bugCounter = 0;
const generateBugId = () => {
  bugCounter++;
  return `bug_${Date.now()}_${bugCounter}`;
};

/**
 * Non-LLM script validation
 */
export const runScriptValidation = (dependencyJSON, files) => {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    checkedReferences: 0,
    missingReferences: 0
  };

  const nodeMap = new Map();
  for (const node of dependencyJSON.nodes) {
    nodeMap.set(node.id, node);
  }

  for (const edge of dependencyJSON.edges) {
    results.checkedReferences++;

    if (!nodeMap.has(edge.from)) {
      results.errors.push({
        type: 'missing_source',
        edge: edge,
        message: `Source node "${edge.from}" does not exist`
      });
      results.missingReferences++;
      results.valid = false;
    }

    if (!nodeMap.has(edge.to)) {
      results.errors.push({
        type: 'missing_target',
        edge: edge,
        message: `Target node "${edge.to}" does not exist`
      });
      results.missingReferences++;
      results.valid = false;
    }
  }

  for (const node of dependencyJSON.nodes) {
    for (const dep of node.dependencies || []) {
      if (!nodeMap.has(dep)) {
        results.errors.push({
          type: 'missing_dependency',
          node: node.id,
          dependency: dep,
          message: `Dependency "${dep}" for node "${node.id}" does not exist`
        });
        results.missingReferences++;
        results.valid = false;
      }
    }
  }

  return results;
};

export default {
  DEPENDENCY_CONFIG,
  createDependencyNode,
  buildDependencyGraph,
  validateCrossReferences,
  generateDependencyJSON,
  analyzeDependencyGraph,
  runScriptValidation
};