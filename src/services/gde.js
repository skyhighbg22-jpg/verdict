/**
 * Goal Decomposition Engine (GDE)
 * Breaks complex user goals into a DAG of sub-tasks
 */

import { bytezClient } from '../api/bytezClient';

/**
 * Task status enum
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed'
};

/**
 * Task priority levels
 */
export const TASK_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Default GDE configuration
 */
export const GDE_CONFIG = {
  maxDepth: 5,
  maxTasksPerLevel: 10,
  allowParallelExecution: true,
  enableSelfCritique: true,
  minTaskSize: 'small' // small, medium, large
};

/**
 * Create a new task node for the DAG
 * 
 * @param {string} id - Unique task ID
 * @param {string} title - Task title
 * @param {string} description - Task description
 * @param {string} priority - Task priority
 * @param {Array} dependencies - Array of task IDs this depends on
 * @returns {Object} Task node
 */
export const createTaskNode = (id, title, description, priority = TASK_PRIORITY.MEDIUM, dependencies = []) => ({
  id,
  title,
  description,
  priority,
  status: TASK_STATUS.PENDING,
  dependencies,
  dependents: [],
  assignedTo: null,
  estimatedEffort: null,
  actualEffort: null,
  createdAt: new Date().toISOString(),
  startedAt: null,
  completedAt: null,
  metadata: {}
});

/**
 * Build a DAG from decomposed tasks
 * 
 * @param {Array} tasks - Array of task objects
 * @returns {Object} DAG structure with adjacency lists
 */
export const buildDAG = (tasks) => {
  const adjacencyList = new Map();
  const reverseList = new Map();
  const taskMap = new Map();

  // Initialize maps
  tasks.forEach(task => {
    adjacencyList.set(task.id, []);
    reverseList.set(task.id, []);
    taskMap.set(task.id, task);
  });

  // Build edges
  tasks.forEach(task => {
    task.dependencies.forEach(depId => {
      if (adjacencyList.has(depId)) {
        adjacencyList.get(depId).push(task.id);
        reverseList.get(task.id).push(depId);
      }
    });
  });

  // Calculate in-degree for topological sort
  const inDegree = new Map();
  tasks.forEach(task => {
    inDegree.set(task.id, task.dependencies.length);
  });

  return {
    tasks: taskMap,
    adjacencyList,
    reverseList,
    inDegree,
    getTopologicalOrder: () => topologicalSort(adjacencyList, inDegree, tasks),
    getParallelGroups: () => getParallelTaskGroups(adjacencyList, inDegree, tasks)
  };
};

/**
 * Perform topological sort on the DAG
 * 
 * @param {Map} adjacencyList - Forward adjacency list
 * @param {Map} inDegree - In-degree map
 * @param {Array} tasks - All tasks
 * @returns {Array} Topologically sorted task IDs
 */
const topologicalSort = (adjacencyList, inDegree, tasks) => {
  const queue = [];
  const result = [];
  const inDegreeCopy = new Map(inDegree);

  // Find all nodes with in-degree 0
  tasks.forEach(task => {
    if (inDegreeCopy.get(task.id) === 0) {
      queue.push(task.id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);

    const neighbors = adjacencyList.get(current) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegreeCopy.get(neighbor) || 1) - 1;
      inDegreeCopy.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  return result;
};

/**
 * Get groups of tasks that can be executed in parallel
 * 
 * @param {Map} adjacencyList - Forward adjacency list
 * @param {Map} inDegree - In-degree map
 * @param {Array} tasks - All tasks
 * @returns {Array} Array of task ID groups
 */
const getParallelTaskGroups = (adjacencyList, inDegree, tasks) => {
  const groups = [];
  const inDegreeCopy = new Map(inDegree);
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  while (inDegreeCopy.size > 0) {
    const currentGroup = [];

    // Find all tasks with in-degree 0
    taskMap.forEach((task, taskId) => {
      if (inDegreeCopy.get(taskId) === 0) {
        currentGroup.push(taskId);
      }
    });

    if (currentGroup.length === 0) break; // Cycle detected

    groups.push(currentGroup);

    // Remove processed tasks and update in-degrees
    currentGroup.forEach(taskId => {
      inDegreeCopy.delete(taskId);
      const neighbors = adjacencyList.get(taskId) || [];
      neighbors.forEach(neighbor => {
        const currentDegree = inDegreeCopy.get(neighbor) || 1;
        inDegreeCopy.set(neighbor, currentDegree - 1);
      });
    });
  }

  return groups;
};

/**
 * Generate unique task ID
 */
let taskCounter = 0;
export const generateTaskId = (prefix = 'task') => {
  taskCounter++;
  return `${prefix}_${Date.now()}_${taskCounter}`;
};

/**
 * Run GDE to decompose a goal
 * 
 * @param {string} goal - The user's goal/prompt
 * @param {Object} config - GDE configuration
 * @returns {Promise<Object>} Decomposed tasks and DAG
 */
export const runGoalDecomposition = async (goal, config = GDE_CONFIG) => {
  const decompositionPrompt = `
    Decompose the following goal into a structured plan of sub-tasks.
    Create a DAG (Directed Acyclic Graph) of tasks with dependencies.
    
    Goal: ${goal}
    
    Configuration:
    - Max depth: ${config.maxDepth}
    - Min task size: ${config.minTaskSize}
    
    Provide your response as JSON array of tasks:
    [
      {
        "id": "task_1",
        "title": "Task Title",
        "description": "Detailed description",
        "priority": "high|medium|low|critical",
        "dependencies": ["task_id_1", "task_id_2"] // IDs of tasks this depends on
      },
      ...
    ]
    
    Guidelines:
    - Break down into atomic, achievable tasks
    - Identify clear dependencies
    - Mark critical path tasks as "critical" priority
    - Include research, implementation, and verification tasks
  `;

  try {
    const response = await bytezClient.runInference('gpt-5.4-pro', {
      systemPrompt: 'You are a task decomposition expert. Break down complex goals into structured, dependent tasks.',
      userPrompt: decompositionPrompt,
      temperature: 0.4
    });

    let tasks = [];
    if (response && response.output) {
      try {
        tasks = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (parseError) {
        console.warn('Failed to parse decomposition, using fallback');
        tasks = createDefaultTasks(goal);
      }
    }

    // Ensure all tasks have IDs and required fields
    tasks = tasks.map((task, index) => createTaskNode(
      task.id || generateTaskId(`task_${index + 1}`),
      task.title,
      task.description,
      task.priority || TASK_PRIORITY.MEDIUM,
      task.dependencies || []
    ));

    const dag = buildDAG(tasks);
    const parallelGroups = dag.getParallelGroups();

    return {
      tasks,
      dag,
      parallelGroups,
      metadata: {
        totalTasks: tasks.length,
        criticalPath: identifyCriticalPath(tasks, dag),
        createdAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Goal decomposition failed, using fallback:', error);
    const tasks = createDefaultTasks(goal);
    const dag = buildDAG(tasks);
    return {
      tasks,
      dag,
      parallelGroups: dag.getParallelGroups(),
      metadata: {
        totalTasks: tasks.length,
        criticalPath: identifyCriticalPath(tasks, dag),
        createdAt: new Date().toISOString(),
        fallback: true
      }
    };
  }
};

/**
 * Create default tasks for fallback
 */
const createDefaultTasks = (goal) => [
  createTaskNode(
    generateTaskId('task_1'),
    'Analyze Requirements',
    `Analyze and clarify the requirements for: ${goal.substring(0, 100)}...`,
    TASK_PRIORITY.HIGH,
    []
  ),
  createTaskNode(
    generateTaskId('task_2'),
    'Research & Information Gathering',
    'Gather necessary information and research relevant solutions',
    TASK_PRIORITY.HIGH,
    ['task_1']
  ),
  createTaskNode(
    generateTaskId('task_3'),
    'Design Solution',
    'Design the solution architecture and implementation plan',
    TASK_PRIORITY.HIGH,
    ['task_2']
  ),
  createTaskNode(
    generateTaskId('task_4'),
    'Implement Solution',
    'Implement the designed solution',
    TASK_PRIORITY.CRITICAL,
    ['task_3']
  ),
  createTaskNode(
    generateTaskId('task_5'),
    'Verify & Test',
    'Verify the implementation and run tests',
    TASK_PRIORITY.HIGH,
    ['task_4']
  ),
  createTaskNode(
    generateTaskId('task_6'),
    'Document & Close Out',
    'Document the implementation and close out the task',
    TASK_PRIORITY.MEDIUM,
    ['task_5']
  )
];

/**
 * Identify critical path through the DAG
 * 
 * @param {Array} tasks - All tasks
 * @param {Object} dag - The DAG structure
 * @returns {Array} Critical path task IDs
 */
const identifyCriticalPath = (tasks, dag) => {
  // Simplified critical path: longest chain of dependent tasks
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const longestPath = [];
  
  // Find tasks with no dependencies (start nodes)
  const startTasks = tasks.filter(t => t.dependencies.length === 0);
  
  const findLongestPath = (taskId, path = []) => {
    const task = taskMap.get(taskId);
    if (!task) return path;
    
    const newPath = [...path, taskId];
    const dependents = dag.adjacencyList.get(taskId) || [];
    
    if (dependents.length === 0) {
      return newPath;
    }
    
    let maxPath = newPath;
    dependents.forEach(depId => {
      const depPath = findLongestPath(depId, newPath);
      if (depPath.length > maxPath.length) {
        maxPath = depPath;
      }
    });
    
    return maxPath;
  };
  
  startTasks.forEach(task => {
    const path = findLongestPath(task.id);
    if (path.length > longestPath.length) {
      longestPath.length = 0;
      longestPath.push(...path);
    }
  });
  
  return longestPath;
};

/**
 * Update task status
 * 
 * @param {Object} dag - The DAG structure
 * @param {string} taskId - Task ID to update
 * @param {string} status - New status
 * @returns {Object} Updated DAG
 */
export const updateTaskStatus = (dag, taskId, status) => {
  const task = dag.tasks.get(taskId);
  if (task) {
    task.status = status;
    if (status === TASK_STATUS.IN_PROGRESS && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }
    if (status === TASK_STATUS.COMPLETED && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
  }
  return dag;
};

export default {
  TASK_STATUS,
  TASK_PRIORITY,
  GDE_CONFIG,
  createTaskNode,
  buildDAG,
  runGoalDecomposition,
  updateTaskStatus,
  generateTaskId
};
