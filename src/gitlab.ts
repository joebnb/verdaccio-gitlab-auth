import got, { OptionsOfTextResponseBody } from 'got';

export interface GitLabInterface {
    url: string;
    publisher: string;
}

export class GitLab {
    private api: string;
    private privateToken: string;

    constructor(api: string, privateToken: string) {
        this.api = api;
        this.privateToken = privateToken;
    }

    private async access(
        api: string,
        options: OptionsOfTextResponseBody & {
            withAuth?: boolean;
            access_token?: string;
        } = { withAuth: false }
    ): Promise<any> {
        const url = this.api + api;

        // add auth
        const headers = {
            accept: 'application/json',
            'content-type': 'application/json;charset=UTF-8',
            'private-token': options.withAuth ? this.privateToken : options.access_token,
        };

        options = {
            headers,
            https: { rejectUnauthorized: false },
            ...options,
        };

        const result = await got(url, options).json();

        return result;
    }

    async getUser(username: string, access_token: string) {
        return await this.access('/users', {
            method: 'get',
            searchParams: {
                username: username,
            },
            access_token,
        });
    }

    async getProjectInfo(project_name: string) {
        return await this.access(`/projects/${encodeURIComponent(project_name)}`, {
            searchParams: {
                id: encodeURIComponent(project_name),
            },
            withAuth: true,
        });
    }

    async getProjectMember(project_name: string) {
        return await this.access(`/projects/${encodeURIComponent(project_name)}/members/all`, {
            searchParams: {
                id: encodeURIComponent(project_name),
            },
            withAuth: true,
        });
    }

    async getGroupProject(group_id: number | string, publish_level: number) {
        return await this.access(`/groups/${group_id}/projects`);
    }

    async createProject(options: { name: string; namespace_id: number | string }) {
        return await this.access(`/projects`, {
            method: 'post',
            json: {
                name: options.name,
                namespace_id: options.namespace_id,
                request_access_enabled: true,
                description: `THIS REPO CREATED AUTOMATICALLY`,
            },
            withAuth: true,
        });
    }

    async addMemberToProject(project_name: string, user_name: string, level: number) {
        const { id: user_id } = (await this.getUser(user_name, this.privateToken))[0];

        return await this.access(`/projects/${encodeURIComponent(project_name)}/members`, {
            method: 'put',
            json: {
                id: encodeURIComponent(project_name),
                user_id: user_id,
                access_level: level,
            },
            withAuth: true,
        });
    }
}
