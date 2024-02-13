#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServiceCdkStack, IStackSettings } from '../lib/service-cdk';

const action: string = process.env.cdk_action || 'deploy';
const accountId: string = process.env.aws_account_id || '301804962855';
const service_key: string = process.env.service_key || 'ob';
const target_environment: string = process.env.target_environment || 'local';
const build_Type: string = process.env.build_Type || 'Release';

const stackSettings: IStackSettings = {
  action: action,
  accountId: accountId,
  service_key: service_key,
  target_environment: target_environment,
  vpc_lambda_cidr: '10.1.0.0/16',
  vpc_api_cidr: '10.3.0.0/16',
  buildType: build_Type,
  env: {
    account: accountId,
    region: 'ap-southeast-2',
  },
};

console.log(stackSettings);

const app = new cdk.App();

new ServiceCdkStack(app, 'OnboardingBuddyInfraCdkStack', stackSettings);
