import LRU from 'lru-cache';
import { Logger, RemoteUser } from '@verdaccio/types';
import { TAuthConfig, TGitInfo } from '../types';

export const ACCESS_LEVEL_MAPPING = {
    $all: 0,
    $guest: 10,
    $reporter: 20,
    $developer: 30,
    $committer: 35,
    $maintainer: 40,
    $owner: 50,
};

const cache = new LRU<string, any>({
    max: 1000,
    maxAge: 1000 * 60 * 15,
});

export class Helper {
    private authConfig: TAuthConfig;
    private config;
    private logger: Logger;
    cache: LRU<string, any>;
    constructor(config, options) {
        this.logger = options.logger;
        this.config = config;
        this.authConfig = config.auth['gitlab-auth'];
        this.cache = cache;
    }

    errorMsg(code: number, msg: string = '') {
        return {
            code: code,
            status: code,
            statusCode: code,
            message: msg,
            name: msg,
            expose: true,
        };
    }

    private getMatchScope(pkgName: string) {
        const mapping = this.authConfig.mapping;
        const scopeList = Object.keys(mapping);

        if (/^@/.test(pkgName)) {
            const [scope, pkgSubName] = pkgName.split('/');
            if (scopeList.indexOf(scope) != -1) {
                return scope;
            }
        }

        if (scopeList.indexOf('**') != -1) {
            return '**';
        }
    }

    getGitMapping(pkg): TGitInfo {
        const pkgName: string = pkg?.name;
        const mapping = this.authConfig.mapping;
        const pkgScope = this.getMatchScope(pkgName);
        let gitInfo = {
            git_path: '',
            group_id: -1,
            publish_level: this?.authConfig?.publish_level,
            access_level: this?.authConfig?.access_level,
            unpublish_level: this.authConfig?.unpublish_level,
        };
        if (!pkgScope || (pkgName.match(/\//gi)?.length || 0) > 1) {
            this.logger.error(`[gitlab-auth]:${pkgName} no matched git project`);
            const scropeStrList = JSON.stringify(Object.keys(this.authConfig.mapping || []));
            return { ...gitInfo, error: `package scope are not one of ${scropeStrList}` };
        }

        const gitMapping = mapping[pkgScope];
        const gitPath = (gitMapping?.git_prefix ?? '') + pkgName.replace(/^@/, '');

        return {
            ...gitInfo,
            ...gitMapping,
            git_path: gitPath,
            group_id: gitMapping.group_id,
            git_prefix: gitMapping.git_prefix,
        };
    }

    checkPermission(pkg, user, members: any, type: 'publish' | 'access' | 'unpublish') {
        const gitInfo = this.getGitMapping(pkg);

        for (let i = 0; i < members.length; i++) {
            const member = members[i];

            const memberLevel: number = member?.access_level;
            if (!memberLevel) {
                this.logger.error('[gitlab-auth]:error member level not get');
            }
            const allowGitLevel = ACCESS_LEVEL_MAPPING[gitInfo[`${type}_level`] || ''];

            const isLoginGitlab = member.username == user.name;
            const isHaveGitlabPermission = memberLevel >= allowGitLevel;

            // should already was porject member and level greater than type level
            if (isLoginGitlab && isHaveGitlabPermission) {
                return true;
            }
        }

        return false;
    }

    findCommon(array1: string[], array2: string[]) {
        const common: string[] = [];
        array1 = array1.sort();
        array2 = array2.sort();
        let i = 0,
            j = 0;

        while (array1.length > i && array2.length > j) {
            if (array1[i] == array2[j]) {
                common.push(array1[i]);
                i++;
                j++;
            }
            console.log('dodod');
            if (array1[i] > array2[j]) {
                j++;
            }

            if (array1[i] < array2[j]) {
                i++;
            }
        }
        return common;
    }

    isLogin(user: RemoteUser) {
        return user?.groups.indexOf('$gitlab') != -1;
    }
}
