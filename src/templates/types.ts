export type TemplateSource = 'oss' | 'user' | 'history' | 'shared' | 'pack';

export interface TrustInfo {
    signed: boolean;
    verifiedBy?: string;
}

export interface TemplateMeta {
    id: string;
    name: string;
    description?: string;
    source: TemplateSource;
    tags: string[];
    parameterized?: boolean;
    lastUsed?: Date;
    useCount?: number;
    author?: string;
    license?: string;
    packId?: string;
    trust?: TrustInfo;
}

export interface ParameterInput {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'enum' | 'date';
    required?: boolean;
    default?: any;
    description?: string;
    enum?: any[];
    pattern?: string;
    min?: number;
    max?: number;
}

export interface Template extends TemplateMeta {
    content: string;
    inputs?: ParameterInput[];
    metadata: {
        createdAt: Date;
        updatedAt: Date;
        version?: string;
    };
    origin?: {
        repo?: string;
        path?: string;
        commit?: string;
    };
}

export interface ListQuery {
    query?: string;
    tags?: string[];
    sources?: TemplateSource[];
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'created' | 'updated' | 'used';
    sortOrder?: 'asc' | 'desc';
}

