import { BaseNode } from './base-node.js';

/**
 * LogicNode - Base class for logic/control flow nodes
 */
export class LogicNode extends BaseNode {
  constructor(data = {}) {
    super({
      category: 'logic',
      ...data
    });
  }
}

/**
 * ConditionNode - Conditional branching based on boolean logic
 */
export class ConditionNode extends LogicNode {
  constructor(data = {}) {
    super({
      type: 'condition',
      name: 'Condition',
      description: 'Conditional branching (if/then/else)',
      ...data
    });

    // Condition properties
    this.condition = data.condition || '';
    this.operator = data.operator || 'equals';
    this.value = data.value ?? '';
    this.caseSensitive = data.caseSensitive ?? false;

    // Input/output sockets
    this.inputs = [
      { id: 'input', name: 'Input', type: 'any' },
      { id: 'compare', name: 'Compare Value', type: 'any' }
    ];
    
    this.outputs = [
      { id: 'true', name: 'True', type: 'any' },
      { id: 'false', name: 'False', type: 'any' },
      { id: 'result', name: 'Result', type: 'boolean' }
    ];
  }

  /**
   * Process conditional logic
   */
  async process(input = null) {
    try {
      this.status = 'processing';
      this.error = null;

      // Get input values
      const inputValue = input?.input ?? this.getData('input');
      const compareValue = input?.compare ?? this.getData('compare') ?? this.value;

      // Evaluate condition
      const result = this.evaluateCondition(inputValue, compareValue);

      this.status = 'completed';

      // Return appropriate output based on condition
      return {
        true: result ? inputValue : null,
        false: !result ? inputValue : null,
        result: result
      };

    } catch (error) {
      this.status = 'error';
      this.error = error.message;
      throw error;
    }
  }

  /**
   * Evaluate the condition
   */
  evaluateCondition(input, compare) {
    // Handle null/undefined
    if (input === null || input === undefined) {
      return this.operator === 'isNull' || this.operator === 'isEmpty';
    }

    // Convert values for comparison
    let inputVal = input;
    let compareVal = compare;

    // String operations
    if (!this.caseSensitive && typeof inputVal === 'string') {
      inputVal = inputVal.toLowerCase();
      if (typeof compareVal === 'string') {
        compareVal = compareVal.toLowerCase();
      }
    }

    // Evaluate based on operator
    switch (this.operator) {
      case 'equals':
        return inputVal === compareVal;
      
      case 'notEquals':
        return inputVal !== compareVal;
      
      case 'greater':
        return Number(inputVal) > Number(compareVal);
      
      case 'greaterOrEqual':
        return Number(inputVal) >= Number(compareVal);
      
      case 'less':
        return Number(inputVal) < Number(compareVal);
      
      case 'lessOrEqual':
        return Number(inputVal) <= Number(compareVal);
      
      case 'contains':
        return String(inputVal).includes(String(compareVal));
      
      case 'notContains':
        return !String(inputVal).includes(String(compareVal));
      
      case 'startsWith':
        return String(inputVal).startsWith(String(compareVal));
      
      case 'endsWith':
        return String(inputVal).endsWith(String(compareVal));
      
      case 'matches':
        try {
          const regex = new RegExp(compareVal, this.caseSensitive ? '' : 'i');
          return regex.test(String(inputVal));
        } catch {
          return false;
        }
      
      case 'isNull':
        return inputVal === null || inputVal === undefined;
      
      case 'isNotNull':
        return inputVal !== null && inputVal !== undefined;
      
      case 'isEmpty':
        return !inputVal || 
               (typeof inputVal === 'string' && inputVal.trim() === '') ||
               (Array.isArray(inputVal) && inputVal.length === 0) ||
               (typeof inputVal === 'object' && Object.keys(inputVal).length === 0);
      
      case 'isNotEmpty':
        return !this.evaluateCondition(input, compare, 'isEmpty');
      
      case 'isTrue':
        return inputVal === true || inputVal === 'true' || inputVal === 1;
      
      case 'isFalse':
        return inputVal === false || inputVal === 'false' || inputVal === 0;
      
      case 'in':
        if (Array.isArray(compareVal)) {
          return compareVal.includes(inputVal);
        }
        return false;
      
      case 'notIn':
        if (Array.isArray(compareVal)) {
          return !compareVal.includes(inputVal);
        }
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Get node configuration for UI
   */
  getConfig() {
    return {
      ...super.getConfig(),
      fields: [
        {
          name: 'operator',
          type: 'select',
          label: 'Operator',
          value: this.operator,
          options: [
            { value: 'equals', label: 'Equals (==)' },
            { value: 'notEquals', label: 'Not Equals (!=)' },
            { value: 'greater', label: 'Greater Than (>)' },
            { value: 'greaterOrEqual', label: 'Greater or Equal (>=)' },
            { value: 'less', label: 'Less Than (<)' },
            { value: 'lessOrEqual', label: 'Less or Equal (<=)' },
            { value: 'contains', label: 'Contains' },
            { value: 'notContains', label: 'Not Contains' },
            { value: 'startsWith', label: 'Starts With' },
            { value: 'endsWith', label: 'Ends With' },
            { value: 'matches', label: 'Matches (Regex)' },
            { value: 'isNull', label: 'Is Null' },
            { value: 'isNotNull', label: 'Is Not Null' },
            { value: 'isEmpty', label: 'Is Empty' },
            { value: 'isNotEmpty', label: 'Is Not Empty' },
            { value: 'isTrue', label: 'Is True' },
            { value: 'isFalse', label: 'Is False' },
            { value: 'in', label: 'In Array' },
            { value: 'notIn', label: 'Not In Array' }
          ]
        },
        {
          name: 'value',
          type: 'text',
          label: 'Compare Value',
          value: this.value,
          visible: (config) => !['isNull', 'isNotNull', 'isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(config.operator)
        },
        {
          name: 'caseSensitive',
          type: 'checkbox',
          label: 'Case Sensitive',
          value: this.caseSensitive,
          visible: (config) => ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'matches'].includes(config.operator)
        }
      ]
    };
  }

  /**
   * Export data for serialization
   */
  toJSON() {
    return {
      ...super.toJSON(),
      condition: this.condition,
      operator: this.operator,
      value: this.value,
      caseSensitive: this.caseSensitive
    };
  }
}

/**
 * SwitchNode - Multi-way branching based on value matching
 */
export class SwitchNode extends LogicNode {
  constructor(data = {}) {
    super({
      type: 'switch',
      name: 'Switch',
      description: 'Multi-way branching (switch/case)',
      ...data
    });

    // Switch properties
    this.cases = data.cases || [
      { value: 'case1', output: 'output1' },
      { value: 'case2', output: 'output2' }
    ];
    this.defaultCase = data.defaultCase ?? true;
    this.caseSensitive = data.caseSensitive ?? false;

    // Dynamic inputs/outputs based on cases
    this.inputs = [
      { id: 'input', name: 'Input', type: 'any' }
    ];
    
    this.outputs = [
      ...this.cases.map((c, i) => ({
        id: c.output || `case${i}`,
        name: `Case: ${c.value}`,
        type: 'any'
      })),
      ...(this.defaultCase ? [{ id: 'default', name: 'Default', type: 'any' }] : [])
    ];
  }

  /**
   * Process switch logic
   */
  async process(input = null) {
    try {
      this.status = 'processing';
      this.error = null;

      const inputValue = input?.input ?? this.getData('input');
      let matchedCase = null;

      // Find matching case
      for (const caseItem of this.cases) {
        if (this.matchesCase(inputValue, caseItem.value)) {
          matchedCase = caseItem;
          break;
        }
      }

      // Build output
      const output = {};
      
      // Set all outputs to null initially
      this.outputs.forEach(out => {
        output[out.id] = null;
      });

      // Set matched output
      if (matchedCase) {
        const outputId = matchedCase.output || `case${this.cases.indexOf(matchedCase)}`;
        output[outputId] = inputValue;
      } else if (this.defaultCase) {
        output.default = inputValue;
      }

      this.status = 'completed';
      return output;

    } catch (error) {
      this.status = 'error';
      this.error = error.message;
      throw error;
    }
  }

  /**
   * Check if value matches case
   */
  matchesCase(input, caseValue) {
    if (!this.caseSensitive && typeof input === 'string' && typeof caseValue === 'string') {
      return input.toLowerCase() === caseValue.toLowerCase();
    }
    return input === caseValue;
  }

  /**
   * Add a new case
   */
  addCase(value, output) {
    const newCase = {
      value: value || `case${this.cases.length + 1}`,
      output: output || `output${this.cases.length + 1}`
    };
    
    this.cases.push(newCase);
    
    // Update outputs
    this.outputs = [
      ...this.cases.map((c, i) => ({
        id: c.output || `case${i}`,
        name: `Case: ${c.value}`,
        type: 'any'
      })),
      ...(this.defaultCase ? [{ id: 'default', name: 'Default', type: 'any' }] : [])
    ];
    
    this.emit('caseAdded', newCase);
  }

  /**
   * Remove a case
   */
  removeCase(index) {
    if (index >= 0 && index < this.cases.length) {
      const removed = this.cases.splice(index, 1)[0];
      
      // Update outputs
      this.outputs = [
        ...this.cases.map((c, i) => ({
          id: c.output || `case${i}`,
          name: `Case: ${c.value}`,
          type: 'any'
        })),
        ...(this.defaultCase ? [{ id: 'default', name: 'Default', type: 'any' }] : [])
      ];
      
      this.emit('caseRemoved', removed);
    }
  }

  /**
   * Get node configuration for UI
   */
  getConfig() {
    return {
      ...super.getConfig(),
      fields: [
        {
          name: 'cases',
          type: 'array',
          label: 'Cases',
          value: this.cases,
          itemFields: [
            {
              name: 'value',
              type: 'text',
              label: 'Match Value',
              placeholder: 'Value to match'
            },
            {
              name: 'output',
              type: 'text',
              label: 'Output Name',
              placeholder: 'Output socket name'
            }
          ],
          addLabel: 'Add Case',
          removeLabel: 'Remove Case'
        },
        {
          name: 'defaultCase',
          type: 'checkbox',
          label: 'Include Default Case',
          value: this.defaultCase
        },
        {
          name: 'caseSensitive',
          type: 'checkbox',
          label: 'Case Sensitive',
          value: this.caseSensitive
        }
      ]
    };
  }

  /**
   * Export data for serialization
   */
  toJSON() {
    return {
      ...super.toJSON(),
      cases: this.cases,
      defaultCase: this.defaultCase,
      caseSensitive: this.caseSensitive
    };
  }
}

// Register node types
if (typeof window !== 'undefined' && window.nodeRegistry) {
  window.nodeRegistry.register('condition', ConditionNode);
  window.nodeRegistry.register('switch', SwitchNode);
}