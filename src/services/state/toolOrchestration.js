/**
 * Tool Orchestration
 * Code execution sandbox, web browsing, API calls, database queries
 */

import { statePersistence } from '../state/statePersistence';

/**
 * Tool types
 */
export const TOOL_TYPES = {
  CODE_EXECUTION: 'code_execution',
  WEB_BROWSING: 'web_browsing',
  API_CALL: 'api_call',
  DATABASE_QUERY: 'database_query',
  FILE_SYSTEM: 'file_system',
  EXTERNAL_SERVICE: 'external_service',
  DOCUMENT_PARSING: 'document_parsing'
};

/**
 * Tool execution status
 */
export const TOOL_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};

/**
 * Tool configuration
 */
export const TOOL_CONFIG = {
  [TOOL_TYPES.CODE_EXECUTION]: {
    timeout: 30000, // 30 seconds
    maxOutputSize: 1000000, // 1MB
    allowedLanguages: ['javascript', 'python', 'bash'],
    sandboxMode: true
  },
  [TOOL_TYPES.WEB_BROWSING]: {
    timeout: 15000,
    maxPages: 10,
    userAgent: 'VERDICT-Bot/1.0'
  },
  [TOOL_TYPES.API_CALL]: {
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
  },
  [TOOL_TYPES.DATABASE_QUERY]: {
    timeout: 5000,
    maxRows: 1000,
    allowWrite: false
  },
  [TOOL_TYPES.FILE_SYSTEM]: {
    allowedPaths: ['/tmp', '/home/engine/project'],
    maxFileSize: 10000000
  },
  [TOOL_TYPES.DOCUMENT_PARSING]: {
    timeout: 30000,
    maxFileSize: 5000000,
    allowedFormats: ['pdf', 'docx', 'txt', 'md', 'json', 'xml', 'csv', 'html'],
    extractImages: false,
    ocrEnabled: false
  }
};

/**
 * Tool execution result
 */
const createToolResult = (toolId, status, output = null, error = null) => ({
  toolId,
  status,
  output,
  error,
  executedAt: new Date().toISOString(),
  duration: 0
});

/**
 * Code Execution Tool
 */
class CodeExecutionTool {
  async execute(code, language = 'javascript', options = {}) {
    const startTime = Date.now();
    
    // Validate language
    if (!TOOL_CONFIG[TOOL_TYPES.CODE_EXECUTION].allowedLanguages.includes(language)) {
      return createToolResult('code_execution', TOOL_STATUS.FAILED, null, 
        `Language ${language} not allowed`);
    }

    try {
      // In production, this would use a sandboxed environment
      // For now, simulate execution
      console.log(`[CodeExec] Running ${language} code...`);
      
      let result;
      if (language === 'javascript') {
        result = await this.executeJavaScript(code);
      } else if (language === 'python') {
        result = await this.executePython(code);
      } else {
        result = await this.executeBash(code);
      }

      return {
        ...createToolResult('code_execution', TOOL_STATUS.SUCCESS, result),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('code_execution', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async executeJavaScript(code) {
    // Simulate JS execution
    // In production, use isolated VM or Web Worker
    try {
      // Basic sandbox simulation
      const safeGlobals = {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        Math,
        JSON,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set
      };
      
      // Create function with limited scope
      const fn = new Function(...Object.keys(safeGlobals), code);
      const result = fn(...Object.values(safeGlobals));
      
      return { result, type: typeof result };
    } catch (e) {
      return { error: e.message };
    }
  }

  async executePython(code) {
    // Try Pyodide if available in environment
    if (typeof window !== 'undefined' && window.pyodide) {
      try {
        const result = await window.pyodide.runPythonAsync(code);
        return { result, type: typeof result, output: String(result) };
      } catch (e) {
        return { error: e.message };
      }
    }
    
    // Fallback: Basic Python syntax simulation
    const lines = code.split('\n');
    const outputs = [];
    const variables = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Simple variable assignment
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const [, varName, value] = assignMatch;
        try {
          variables[varName] = eval(value);
        } catch {
          variables[varName] = value;
        }
        continue;
      }
      
      // Print statement simulation
      const printMatch = trimmed.match(/^print\((.+)\)$/);
      if (printMatch) {
        const expr = printMatch[1];
        try {
          outputs.push(eval(expr));
        } catch {
          outputs.push(`[${expr}]`);
        }
      }
    }
    
    return { 
      result: outputs.length > 0 ? outputs.join('\n') : 'Executed',
      variables,
      output: outputs.join('\n'),
      type: 'simulated'
    };
  }

  async executeBash(command) {
    // In production, use containerized execution
    return { result: 'Bash execution simulated', output: `Would run: ${command}` };
  }
}

/**
 * Web Browsing Tool
 */
class WebBrowsingTool {
  constructor() {
    this.session = null;
  }

  async fetch(url, options = {}) {
    const startTime = Date.now();
    
    try {
      // In production, use Puppeteer or similar
      console.log(`[WebBrowse] Fetching: ${url}`);
      
      // Simulate fetch
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': TOOL_CONFIG[TOOL_TYPES.WEB_BROWSING].userAgent
        },
        signal: AbortSignal.timeout(TOOL_CONFIG[TOOL_TYPES.WEB_BROWSING].timeout)
      });

      const html = await response.text();

      return {
        ...createToolResult('web_browsing', TOOL_STATUS.SUCCESS, {
          url,
          status: response.status,
          content: html.substring(0, TOOL_CONFIG[TOOL_TYPES.WEB_BROWSING].maxPages * 1000),
          contentType: response.headers.get('content-type')
        }),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('web_browsing', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async search(query, engine = 'google') {
    const searchUrl = engine === 'google' 
      ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
      : `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

    return this.fetch(searchUrl);
  }
}

/**
 * API Call Tool
 */
class APICallTool {
  async call(endpoint, options = {}) {
    const startTime = Date.now();
    const { method = 'GET', headers = {}, body, retries = 3 } = options;

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(TOOL_CONFIG[TOOL_TYPES.API_CALL].timeout)
        });

        const data = await response.json();

        return {
          ...createToolResult('api_call', TOOL_STATUS.SUCCESS, {
            endpoint,
            method,
            status: response.status,
            data
          }),
          duration: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;
        console.warn(`API call attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, TOOL_CONFIG[TOOL_TYPES.API_CALL].retryDelay * attempt));
        }
      }
    }

    return {
      ...createToolResult('api_call', TOOL_STATUS.FAILED, null, lastError.message),
      duration: Date.now() - startTime
    };
  }

  async callBytez(model, input) {
    const { bytezClient } = await import('../../api/bytezClient');
    return bytezClient.runInference(model, input);
  }
}

/**
 * Database Query Tool
 * Uses IndexedDB for persistent storage in browser environment
 */
class DatabaseQueryTool {
  constructor() {
    this.dbName = 'verdict_db';
    this.dbVersion = 1;
    this.db = null;
    this.data = new Map();
    this.initPromise = this.initDatabase();
  }

  async initDatabase() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[DB] IndexedDB not available, using in-memory fallback');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('[DB] IndexedDB error, using in-memory fallback');
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[DB] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('facts')) {
          db.createObjectStore('facts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async ensureReady() {
    await this.initPromise;
  }

  async query(sql, params = {}) {
    const startTime = Date.now();
    await this.ensureReady();

    const isSelect = sql.trim().toLowerCase().startsWith('select');
    
    if (!isSelect) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, 
          'Only SELECT queries allowed'),
        duration: Date.now() - startTime
      };
    }

    // Parse simple SELECT queries
    const tableMatch = sql.match(/from\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : null;

    if (!table) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, 
          'Invalid SELECT query'),
        duration: Date.now() - startTime
      };
    }

    try {
      if (this.db) {
        const result = await this.queryIndexedDB(table, sql, params);
        return {
          ...createToolResult('database_query', TOOL_STATUS.SUCCESS, {
            rows: result,
            affectedRows: result.length,
            query: sql,
            source: 'indexeddb'
          }),
          duration: Date.now() - startTime
        };
      } else {
        // Fallback to in-memory
        const rows = this.data.get(table) || [];
        return {
          ...createToolResult('database_query', TOOL_STATUS.SUCCESS, {
            rows,
            affectedRows: rows.length,
            query: sql,
            source: 'memory'
          }),
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async queryIndexedDB(table, sql, params) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async insert(table, data) {
    const startTime = Date.now();
    await this.ensureReady();

    const record = { ...data, id: data.id || `row_${Date.now()}`, createdAt: new Date().toISOString() };

    try {
      if (this.db) {
        await this.insertIndexedDB(table, record);
      } else {
        if (!this.data.has(table)) {
          this.data.set(table, []);
        }
        this.data.get(table).push(record);
      }

      return {
        ...createToolResult('database_query', TOOL_STATUS.SUCCESS, {
          rows: [record],
          affectedRows: 1,
          operation: 'insert',
          source: this.db ? 'indexeddb' : 'memory'
        }),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async insertIndexedDB(table, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(table, id, data) {
    const startTime = Date.now();
    await this.ensureReady();

    const record = { ...data, id, updatedAt: new Date().toISOString() };

    try {
      if (this.db) {
        await this.updateIndexedDB(table, record);
      } else {
        const rows = this.data.get(table) || [];
        const index = rows.findIndex(r => r.id === id);
        if (index >= 0) {
          rows[index] = record;
        }
      }

      return {
        ...createToolResult('database_query', TOOL_STATUS.SUCCESS, {
          rows: [record],
          affectedRows: 1,
          operation: 'update'
        }),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async updateIndexedDB(table, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.put(record);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(table, id) {
    const startTime = Date.now();
    await this.ensureReady();

    try {
      if (this.db) {
        await this.deleteIndexedDB(table, id);
      } else {
        const rows = this.data.get(table) || [];
        this.data.set(table, rows.filter(r => r.id !== id));
      }

      return {
        ...createToolResult('database_query', TOOL_STATUS.SUCCESS, {
          affectedRows: 1,
          operation: 'delete'
        }),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('database_query', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async deleteIndexedDB(table, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getDbStatus() {
    return {
      initialized: !!this.db,
      inMemoryTables: Array.from(this.data.keys()),
      storage: this.db ? 'IndexedDB' : 'in-memory'
    };
  }
}

/**
 * Document Parsing Tool
 * Supports PDF, DOCX, TXT, MD, JSON, XML, CSV, HTML
 */
class DocumentParsingTool {
  constructor() {
    this.parsers = {
      pdf: this.parsePDF.bind(this),
      docx: this.parseDOCX.bind(this),
      txt: this.parseText.bind(this),
      md: this.parseMarkdown.bind(this),
      json: this.parseJSON.bind(this),
      xml: this.parseXML.bind(this),
      csv: this.parseCSV.bind(this),
      html: this.parseHTML.bind(this)
    };
  }

  async parse(content, format, options = {}) {
    const startTime = Date.now();
    const config = TOOL_CONFIG[TOOL_TYPES.DOCUMENT_PARSING];

    if (!config.allowedFormats.includes(format.toLowerCase())) {
      return {
        ...createToolResult('document_parsing', TOOL_STATUS.FAILED, null,
          `Format ${format} not supported`),
        duration: Date.now() - startTime
      };
    }

    try {
      const parser = this.parsers[format.toLowerCase()];
      if (!parser) {
        return {
          ...createToolResult('document_parsing', TOOL_STATUS.FAILED, null,
            `No parser for format ${format}`),
          duration: Date.now() - startTime
        };
      }

      const result = await parser(content, options);

      return {
        ...createToolResult('document_parsing', TOOL_STATUS.SUCCESS, {
          format,
          content: result.content,
          metadata: result.metadata,
          extractedData: result.data,
          pageCount: result.pageCount,
          wordCount: result.wordCount
        }),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        ...createToolResult('document_parsing', TOOL_STATUS.FAILED, null, error.message),
        duration: Date.now() - startTime
      };
    }
  }

  async parseText(content, options = {}) {
    return {
      content: content,
      metadata: { type: 'text', encoding: 'utf-8' },
      data: { text: content },
      wordCount: content.split(/\s+/).length
    };
  }

  async parseMarkdown(content, options = {}) {
    const headings = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    
    for (const line of lines) {
      if (line.startsWith('```')) inCodeBlock = !inCodeBlock;
      if (line.match(/^#{1,6}\s/)) {
        headings.push(line.replace(/^#{1,6}\s+/, '').trim());
      }
    }

    return {
      content: content,
      metadata: { type: 'markdown', headingCount: headings.length },
      data: { headings, text: content },
      wordCount: content.split(/\s+/).length
    };
  }

  async parseJSON(content, options = {}) {
    try {
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      return {
        content: JSON.stringify(data, null, 2),
        metadata: { type: 'json', valid: true },
        data,
        keys: Object.keys(data),
        isArray: Array.isArray(data)
      };
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
  }

  async parseXML(content, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    
    if (errorNode) {
      throw new Error('Invalid XML');
    }

    const extractText = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      return Array.from(node.childNodes).map(extractText).join('');
    };

    return {
      content,
      metadata: { type: 'xml', valid: true },
      data: { xml: content, rootTag: doc.documentElement.tagName },
      wordCount: extractText(doc).split(/\s+/).length
    };
  }

  async parseCSV(content, options = {}) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      return { content, metadata: { type: 'csv', rows: 0 }, data: { rows: [] }, wordCount: 0 };
    }

    const delimiter = options.delimiter || ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i]?.trim() || '';
      });
      return row;
    });

    return {
      content,
      metadata: { type: 'csv', headers, rowCount: rows.length },
      data: { headers, rows },
      wordCount: content.split(/\s+/).length
    };
  }

  async parseHTML(content, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const extractText = (el) => {
      return el.textContent?.trim() || '';
    };

    const scripts = doc.querySelectorAll('script, style').forEach(el => el.remove());
    
    const title = doc.querySelector('title')?.textContent || '';
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent.trim());
    const links = Array.from(doc.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    }));

    return {
      content,
      metadata: { type: 'html', title, headingCount: headings.length, linkCount: links.length },
      data: { title, headings, links, text: extractText(doc.body) },
      wordCount: extractText(doc.body).split(/\s+/).length
    };
  }

  async parsePDF(content, options = {}) {
    return {
      content: '[PDF Content - Simulated]',
      metadata: { type: 'pdf', pageCount: options.pageCount || 1 },
      data: { pages: ['[PDF content extraction simulated]'] },
      wordCount: 100
    };
  }

  async parseDOCX(content, options = {}) {
    return {
      content: '[DOCX Content - Simulated]',
      metadata: { type: 'docx' },
      data: { text: '[DOCX content extraction simulated]' },
      wordCount: 100
    };
  }
}

/**
 * Main Tool Orchestrator
 */
class ToolOrchestrator {
  constructor() {
    this.codeExec = new CodeExecutionTool();
    this.webBrowse = new WebBrowsingTool();
    this.apiCall = new APICallTool();
    this.dbQuery = new DatabaseQueryTool();
    this.docParse = new DocumentParsingTool();
    this.executionHistory = [];
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolType, params) {
    const toolId = `tool_${Date.now()}`;
    
    let result;
    switch (toolType) {
      case TOOL_TYPES.CODE_EXECUTION:
        result = await this.codeExec.execute(params.code, params.language, params.options);
        break;
      case TOOL_TYPES.WEB_BROWSING:
        if (params.action === 'search') {
          result = await this.webBrowse.search(params.query, params.engine);
        } else {
          result = await this.webBrowse.fetch(params.url);
        }
        break;
      case TOOL_TYPES.API_CALL:
        if (params.bytez) {
          result = await this.apiCall.callBytez(params.model, params.input);
        } else {
          result = await this.apiCall.call(params.endpoint, params.options);
        }
        break;
      case TOOL_TYPES.DATABASE_QUERY:
        result = await this.dbQuery.query(params.sql, params.params);
        break;
      case TOOL_TYPES.DOCUMENT_PARSING:
        result = await this.docParse.parse(params.content, params.format, params.options);
        break;
      default:
        result = createToolResult(toolType, TOOL_STATUS.FAILED, null, `Unknown tool: ${toolType}`);
    }

    // Record execution
    this.executionHistory.push({
      toolId,
      toolType,
      params,
      result,
      timestamp: new Date().toISOString()
    });

    return { toolId, ...result };
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(toolRequests) {
    const promises = toolRequests.map(req => 
      this.executeTool(req.type, req.params)
    );
    return Promise.all(promises);
  }

  /**
   * Execute tools sequentially (for dependent operations)
   */
  async executeSequential(toolRequests) {
    const results = [];
    const context = {};

    for (const req of toolRequests) {
      // Pass previous results as context
      const params = { ...req.params, context };
      const result = await this.executeTool(req.type, params);
      results.push(result);

      // Add to context for dependent tools
      if (result.status === TOOL_STATUS.SUCCESS) {
        context[req.type] = result.output;
      }
    }

    return results;
  }

  /**
   * Get tool execution history
   */
  getHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.executionHistory = [];
  }
}

// Singleton instance
export const toolOrchestrator = new ToolOrchestrator();

// Convenience functions
export const executeCode = (code, language, options) => 
  toolOrchestrator.executeTool(TOOL_TYPES.CODE_EXECUTION, { code, language, options });
export const browseWeb = (url) => 
  toolOrchestrator.executeTool(TOOL_TYPES.WEB_BROWSING, { url });
export const searchWeb = (query, engine) => 
  toolOrchestrator.executeTool(TOOL_TYPES.WEB_BROWSING, { action: 'search', query, engine });
export const callAPI = (endpoint, options) => 
  toolOrchestrator.executeTool(TOOL_TYPES.API_CALL, { endpoint, options });
export const queryDB = (sql, params) => 
  toolOrchestrator.executeTool(TOOL_TYPES.DATABASE_QUERY, { sql, params });
export const parseDocument = (content, format, options) => 
  toolOrchestrator.executeTool(TOOL_TYPES.DOCUMENT_PARSING, { content, format, options });

export default {
  toolOrchestrator,
  TOOL_TYPES,
  TOOL_STATUS,
  TOOL_CONFIG,
  executeCode,
  browseWeb,
  searchWeb,
  callAPI,
  queryDB,
  parseDocument
};
