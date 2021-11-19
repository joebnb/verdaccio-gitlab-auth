# verdaccio-gitlab-auth

> gitlab api auth inspired by verdaccio-gitlab

---

## Install 
```
npm i verdaccio-gitlab-auth
```

## Useage
publishlevel: 

### api | string
gitlab api address
### private_token | string
gitlab access token,which was the owner of 'mapping.group_id'.

> this private token will create npm package repository in gitlab group_id,and grant access to user who request publish.
### mapping | object
#### "KEY: SCOPE" 
object key of mapping which was allowed user to publish scope
#### group_id | number
the group which `private_token` have owner permission.
#### access_level,publish_level,upbpulish_level | '$guest' | '$reporter'| '$developer' |'$maintainer' | '$owner' | '$all' | '$authenticated'

## attention
> attention: unpublish broken by verdaccio it's self,if setting $authenticated in package it will fallback to checke publish permmision and do unpublish

example:
```
gitlab-auth:
  api: yourgitlab.com/api/v4/
  private_token: access_token
  mapping:
    '@scope/*':
      # git_prefix: npm/ this value not working currently
      group_id: id
      access_level: $all
      publish_level: $maintainer
      unpublish_level: undefined  or no permission level // it will active unpublish fallback and use publish_level "$maintainer" to check permisson,this behavior should be attention
      
packages:
  '@scope/*':
    access: $all
    publish: $authenticated # if need make publish work it should be set $authenticated
    unpublish: undefined  # packages unpublish recommend to set `undefined` to make unpublish disable.
```
> note: in first publish this plugin will use `private_token` create repository for user manage publish permission for thier collaborators,this repo place is under `group_id`.