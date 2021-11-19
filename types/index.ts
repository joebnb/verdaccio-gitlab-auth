import { Config } from '@verdaccio/types';

export type TGitlabLevel = '$guest' | '$reporter' | '$developer' | '$committer' | '$maintainer' | '$owner' | '$all' | '$authenticated';
export type TBuiltInLevel = '$all' | '$anonymous' | '@all' | '@anonymous' | 'all' | 'undefined' | 'anonymous' | string;

export type TAllLevel = TGitlabLevel & TBuiltInLevel;

export type TGitMapping = {
    git_prefix: string;
    group_id: number;
    publish_level: TAllLevel;
    access_level: TAllLevel;
    unpublish_level: TAllLevel;
};

export type TAuthConfig = {
    api: string;
    private_token: string;
    publish_level: TAllLevel;
    access_level: TAllLevel;
    unpublish_level: TAllLevel;
    mapping: {
        [scope: string]: TGitMapping;
    };
};

export type TGitInfo = {
    git_path: string;
    git_prefix?: string;
    group_id: number;
    publish_level?: TAllLevel;
    access_level?: TAllLevel;
    unpublish_level?: TAllLevel;
    error?: string;
};
export interface CustomConfig extends Config {
    auth: {
        'gitlab-auth': TAuthConfig;
    };
    [x: string]: any;
}
