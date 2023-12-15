# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


**1 Create cdk project**

```
cdk init --language typescript
```

**2 Bootstrap the project with AWS**

cdk bootstrap is a tool in the AWS CDK command-line interface responsible for populating a given environment (that is, a combination of AWS account and region) with resources required by the CDK to perform deployments into that environment.

When you run cdk bootstrap cdk deploys the CDK toolkit stack into an AWS environment.

```
cdk bootstrap --profile [profile_name]
```

**3 Project structure**

lib/service-cdk-stack.ts is where your CDK application’s main stack is defined. 

bin/service-cdk-backend.ts is the entrypoint of the CDK application. 
It will load the stack defined in lib/service-cdk-stack.ts.

4 Save it and make sure it builds and creates a stack.

```
cdk synth
```

5 Deploy the stack

```
cdk deploy
```