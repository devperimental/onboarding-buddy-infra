import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface IStackSettings extends cdk.StackProps {
  action: string;
  accountId: string;
  service_key: string;
  target_environment: string;
  vpc_cidr: string;
  buildType: string;
}

export class ServiceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IStackSettings) {
    super(scope, id, props);

    // Create a VPC for the Lambda service
    const vpc = new ec2.Vpc(this, `application-vpc`, {
      cidr: props.vpc_cidr,
      natGateways: 1,
      subnetConfiguration: [
        { cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: 'Public' },
        {
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          name: 'Private',
        },
      ],
      maxAzs: 2,
    });

    // Create security groups for a Lambda Service

    // Egress SG for outbound traffic --> SQL DB Azure
    const egressSg = new ec2.SecurityGroup(this, 'EgressSG', {
      securityGroupName: 'egress-sg',
      vpc: vpc,
    });

    egressSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // VPE SG for AWS traffic
    const vpeSg = new ec2.SecurityGroup(this, 'VpeSG', {
      securityGroupName: 'vpe-sg',
      vpc: vpc,
    });

    vpeSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // VPC Endpoint to access Secrets Manager
    const secretsManagerEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      'SecretsManagerEndpoint',
      {
        vpc,
        service: new ec2.InterfaceVpcEndpointService(
          'com.amazonaws.ap-southeast-2.secretsmanager',
          443
        ),
        securityGroups: [vpeSg],
      }
    );
  }
}
