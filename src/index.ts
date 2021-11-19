import { PluginOptions, AuthAccessCallback, AuthCallback, PackageAccess, IPluginAuth, RemoteUser, Logger } from '@verdaccio/types';
import { getInternalError, getUnauthorized, getBadRequest, getForbidden } from '@verdaccio/commons-api';
import { CustomConfig, TAuthConfig } from '../types/index';

import { GitLab } from './gitlab';
import { Helper, ACCESS_LEVEL_MAPPING } from './helper';

let GITLAB_USER;
export default class AuthCustomPlugin implements IPluginAuth<CustomConfig> {
    public logger: Logger;
    private config: CustomConfig;
    private authConfig: TAuthConfig;
    private gitlabIns: GitLab;
    private helper: Helper;
    public constructor(config: CustomConfig, options: PluginOptions<CustomConfig>) {
        this.logger = options.logger;
        this.config = config;
        this.authConfig = config.auth['gitlab-auth'];
        this.gitlabIns = new GitLab(this.authConfig.api, this.authConfig.private_token);
        this.helper = new Helper(config, options);
    }
    /**
     * Authenticate an user.
     * @param user user to log
     * @param password provided password
     * @param cb callback function
     */
    public authenticate(user: string, password: string, cb: AuthCallback): void {
        const lruKey = user + password;
        const { cache } = this.helper;
        GITLAB_USER = cache.get(lruKey);
        if (GITLAB_USER && GITLAB_USER.id) {
            return cb(null, ['$gitlab']);
        }

        this.gitlabIns
            .getUser(user, password)
            .then((data) => {
                GITLAB_USER = data[0];
                cache.set(lruKey, GITLAB_USER);
                cb(null, ['$gitlab']);
            })
            .catch((e) => {
                cb(getUnauthorized('[gitlab-auth]: Unauthorized'), false);
            });
    }

    public allow_access(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
        if (pkg.access?.includes('$all')) {
            return cb(null, true);
        }
        this.checkAccess('access', user, pkg, cb);
    }

    public allow_publish(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
        if (pkg.publish?.includes('$all')) {
            return cb(null, true);
        }

        this.checkAccess('publish', user, pkg, cb);
    }

    public allow_unpublish(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
        if ((pkg as any)?.unpublish?.includes('$all')) {
            return cb(null, true);
        }
        this.checkAccess('unpublish', user, pkg, cb);
    }

    private checkAccess(type: 'publish' | 'access' | 'unpublish', user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback) {
        if (!this.helper.isLogin(user)) {
            return cb(getUnauthorized('[gitlab-auth]: Access unauthorized,did you login?'), false);
        }

        const gitInfo = this.helper.getGitMapping(pkg);
        if (gitInfo.error) {
            return cb(getBadRequest(`[gitlab-auth]: package @scope/name ${(pkg as any).name} not allowed by system config.`), false);
        }

        this.gitlabIns
            .getProjectMember(gitInfo.git_path)
            .then((members) => {
                const hasPermission = this.helper.checkPermission(pkg, user, members, type);
                if (hasPermission) {
                    cb(null, true);
                } else {
                    cb(getForbidden(`[gitlab-auth]:user ${user.name} not have permission on ${(pkg as any).name}`), false);
                }
            })
            .catch((e) => {
                // fixme: error code cant get,so it cant recognize server 500
                // this case always need create a new repo and let them go next process
                if (type == 'publish') {
                    this.publishFallback(gitInfo, cb);
                }
            });
    }

    publishFallback(gitInfo, cb) {
        const project_basename: string = gitInfo.git_path?.split('/')?.pop() as string;
        this.gitlabIns
            .createProject({ name: project_basename, namespace_id: gitInfo.group_id })
            .then((d) => {
                const { id, name } = d;
                this.gitlabIns
                    .addMemberToProject(id, GITLAB_USER.id, ACCESS_LEVEL_MAPPING.$maintainer)
                    .then((d) => {
                        cb(null, true);
                    })
                    .catch((e) => {
                        cb(getInternalError(`[gitlab-auth]: add member ${GITLAB_USER.name} to ${project_basename} error`));
                    });
            })
            .catch((e) => {
                cb(getInternalError(`[gitlab-auth]: create project ${gitInfo.git_path} error,did groupId is vaild or group contain current member?`));
            });
    }
}
