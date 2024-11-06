export interface CommandResponse {
    success: boolean;
    data?: string;
    error?: string;
}

export interface CommandRequest {
    command: 'generate' | 'template';
    prompt?: string;
    language?: string;
    templateType?: string;
    subtype?: string;
} 