import { useState } from 'react';
import './FormBuilder.css';

const FormBuilder = ({ fields, onChange }) => {
    const [editingField, setEditingField] = useState(null);

    const fieldTypes = [
        { value: 'text', label: 'Short Text', icon: '📝' },
        { value: 'textarea', label: 'Long Text', icon: '📄' },
        { value: 'number', label: 'Number', icon: '🔢' },
        { value: 'dropdown', label: 'Dropdown', icon: '📋' },
        { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
        { value: 'radio', label: 'Radio Buttons', icon: '🔘' }
    ];

    const addField = (type) => {
        const newField = {
            id: `field_${Date.now()}`,
            type,
            label: `New ${type} field`,
            placeholder: '',
            required: false,
            options: type === 'dropdown' || type === 'checkbox' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined
        };

        onChange([...fields, newField]);
        setEditingField(newField.id);
    };

    const updateField = (id, updates) => {
        onChange(fields.map(field =>
            field.id === id ? { ...field, ...updates } : field
        ));
    };

    const deleteField = (id) => {
        onChange(fields.filter(field => field.id !== id));
        if (editingField === id) {
            setEditingField(null);
        }
    };

    const moveField = (index, direction) => {
        const newFields = [...fields];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < fields.length) {
            [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
            onChange(newFields);
        }
    };

    const updateOptions = (id, optionsString) => {
        const options = optionsString.split('\n').filter(opt => opt.trim());
        updateField(id, { options });
    };

    return (
        <div className="form-builder">
            <div className="builder-header">
                <h3>Build Your Registration Form</h3>
                <p className="builder-subtitle">Add fields that participants will fill during registration</p>
            </div>

            {/* Field Type Selector */}
            <div className="field-types">
                <p className="field-types-label">Add Field:</p>
                <div className="field-types-grid">
                    {fieldTypes.map(type => (
                        <button
                            key={type.value}
                            onClick={() => addField(type.value)}
                            className="field-type-btn"
                            type="button"
                        >
                            <span className="field-type-icon">{type.icon}</span>
                            <span className="field-type-label">{type.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Fields List */}
            {fields.length === 0 ? (
                <div className="empty-builder">
                    <div className="empty-icon">📋</div>
                    <p>No fields added yet</p>
                    <p className="empty-subtitle">Click on a field type above to get started</p>
                </div>
            ) : (
                <div className="fields-list">
                    {fields.map((field, index) => (
                        <div key={field.id} className={`field-item ${editingField === field.id ? 'editing' : ''}`}>
                            <div className="field-header">
                                <div className="field-info">
                                    <span className="field-number">{index + 1}</span>
                                    <span className="field-label-display">{field.label}</span>
                                    {field.required && <span className="required-badge">Required</span>}
                                </div>
                                <div className="field-actions">
                                    <button
                                        onClick={() => moveField(index, 'up')}
                                        disabled={index === 0}
                                        className="btn-icon"
                                        type="button"
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => moveField(index, 'down')}
                                        disabled={index === fields.length - 1}
                                        className="btn-icon"
                                        type="button"
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                                        className="btn-icon"
                                        type="button"
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => deleteField(field.id)}
                                        className="btn-icon btn-danger"
                                        type="button"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {editingField === field.id && (
                                <div className="field-editor">
                                    <div className="editor-group">
                                        <label>Field Label</label>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            placeholder="Enter field label"
                                        />
                                    </div>

                                    {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                                        <div className="editor-group">
                                            <label>Placeholder</label>
                                            <input
                                                type="text"
                                                value={field.placeholder || ''}
                                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                                placeholder="Enter placeholder text"
                                            />
                                        </div>
                                    )}

                                    {(field.type === 'dropdown' || field.type === 'checkbox' || field.type === 'radio') && (
                                        <div className="editor-group">
                                            <label>Options (one per line)</label>
                                            <textarea
                                                value={field.options?.join('\n') || ''}
                                                onChange={(e) => updateOptions(field.id, e.target.value)}
                                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                rows={4}
                                            />
                                        </div>
                                    )}

                                    <div className="editor-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            />
                                            Required field
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Field Preview */}
                            <div className="field-preview">
                                <label className="preview-label">
                                    {field.label}
                                    {field.required && <span className="required-star">*</span>}
                                </label>

                                {field.type === 'text' && (
                                    <input type="text" placeholder={field.placeholder} disabled />
                                )}

                                {field.type === 'textarea' && (
                                    <textarea placeholder={field.placeholder} rows={3} disabled />
                                )}

                                {field.type === 'number' && (
                                    <input type="number" placeholder={field.placeholder} disabled />
                                )}

                                {field.type === 'dropdown' && (
                                    <select disabled>
                                        <option>Select an option</option>
                                        {field.options?.map((opt, i) => (
                                            <option key={i}>{opt}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'checkbox' && (
                                    <div className="preview-options">
                                        {field.options?.map((opt, i) => (
                                            <label key={i} className="preview-option">
                                                <input type="checkbox" disabled />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {field.type === 'radio' && (
                                    <div className="preview-options">
                                        {field.options?.map((opt, i) => (
                                            <label key={i} className="preview-option">
                                                <input type="radio" name={field.id} disabled />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {fields.length > 0 && (
                <div className="builder-footer">
                    <p className="field-count">
                        {fields.length} field{fields.length !== 1 ? 's' : ''} added
                    </p>
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
