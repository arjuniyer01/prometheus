import { execSync } from 'child_process';

export function getAnalysisVersion(): string {
    try {
        return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim();
    } catch (error) {
        console.error('Error getting git version:', error);
        return 'v0';
    }
}
