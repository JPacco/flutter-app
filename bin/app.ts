#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main';

const app = new cdk.App();
new MainStack(app, 'AppStack', {

  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  stackName: `${process.env.ENV}-${process.env.PROJECT}-stack`,
  description: "deploy pipeline to flask app"
});

cdk.Tags.of(app).add('Env', process.env.ENV as string);
cdk.Tags.of(app).add('Owner', process.env.OWNER as string);
cdk.Tags.of(app).add('Project', process.env.PROJECT as string);