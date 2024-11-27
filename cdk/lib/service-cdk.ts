import * as cdk from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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

    this.createLambdaVpc(props);
  }

  private createLambdaVpc(props: IStackSettings) {
    // Create a VPC for the Lambda services
    const vpc = new ec2.Vpc(
      this,
      `lambda-vpc-alt-${props.target_environment}`,
      {
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
      }
    );

    // save vpcId to SSM parameter
    new ssm.StringParameter(this, 'ssm-vpcId', {
      parameterName: `/network/${props.target_environment}/vpcId`,
      stringValue: vpc.vpcId,
    });

    // save privateSubnetIds to SSM parameter
    const privateSubnetIds = vpc.privateSubnets.map((sn, i) => {
      return sn.subnetId;
    });

    new ssm.StringParameter(this, 'ssm-privateSubnetIds', {
      parameterName: `/network/${props.target_environment}/privateSubnetIds`,
      stringValue: Fn.join(',', privateSubnetIds),
    });

    // Egress SG for outbound traffic --> SQL DB Azure
    const egressSg = new ec2.SecurityGroup(this, 'LambdaEgressSG', {
      securityGroupName: `lambda-egress-sg-alt-${props.target_environment}`,
      vpc: vpc,
    });

    egressSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));
    egressSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(6379));
    egressSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(6380));

    // get predefined securitygroup
    const redisSg = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc: vpc,
      securityGroupName: `redis-egress-sg-alt-${props.target_environment}`,
      allowAllOutbound: true,
      description: 'Security group for Redis',
    });

    redisSg.addIngressRule(
      ec2.Peer.securityGroupId(egressSg.securityGroupId),
      ec2.Port.tcp(6379)
    );

    redisSg.addIngressRule(
      ec2.Peer.securityGroupId(egressSg.securityGroupId),
      ec2.Port.tcp(6380)
    );

    // save egressSecurityGroupId to SSM parameter
    new ssm.StringParameter(this, 'ssm-egressSecurityGroupId', {
      parameterName: `/network/${props.target_environment}/egressSecurityGroupId`,
      stringValue: egressSg.securityGroupId,
    });

    // VPE SG for AWS traffic
    const vpeSg = new ec2.SecurityGroup(this, 'LambdaVpeSG', {
      securityGroupName: `lambda-vpe-sg-alt-${props.target_environment}`,
      vpc: vpc,
    });

    vpeSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // save vpeSecurityGroupId to SSM parameter
    new ssm.StringParameter(this, 'ssm-vpeSecurityGroupId', {
      parameterName: `/network/${props.target_environment}/vpeSecurityGroupId`,
      stringValue: vpeSg.securityGroupId,
    });

    // Add an interface endpoint
    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,

      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
    });

    // Add an interface endpoint
    vpc.addInterfaceEndpoint('EventBridgeEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.EVENTBRIDGE,

      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
    });

    vpc.addInterfaceEndpoint('ElasticacheEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ELASTICACHE,

      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
    });

    // VPC Endpoint to access Secrets Manager
    // const secretsManagerEndpoint = new ec2.InterfaceVpcEndpoint(
    //   this,
    //   'SecretsManagerEndpoint',
    //   {
    //     vpc,
    //     service: new ec2.InterfaceVpcEndpointService(
    //       'com.amazonaws.ap-southeast-2.secretsmanager',
    //       443
    //     ),
    //     securityGroups: [vpeSg],
    //   }
    // );

    // // VPC Endpoint to access Secrets Manager
    // const eventBridgeManagerEndpoint = new ec2.InterfaceVpcEndpoint(
    //   this,
    //   'EventBridgeEndpoint',
    //   {
    //     vpc,
    //     service: new ec2.InterfaceVpcEndpointService(
    //       'com.amazonaws.ap-southeast-2.events',
    //       443
    //     ),
    //     securityGroups: [vpeSg],
    //   }
    // );

    new cdk.CfnOutput(this, 'vpcId', { value: vpc.vpcId });
    new cdk.CfnOutput(this, 'privateSubnetIds', {
      value: JSON.stringify(privateSubnetIds),
    });
    new cdk.CfnOutput(this, 'egressSecurityGroupId', {
      value: egressSg.securityGroupId,
    });
    new cdk.CfnOutput(this, 'vpeSecurityGroupId', {
      value: vpeSg.securityGroupId,
    });
  }
  /*
  private createApiVpc(props: IStackSettings) {
    // Create a VPC for the ECS Fargate containers
    const vpc = new ec2.Vpc(this, `api-vpc-alt-${props.target_environment}`, {
      cidr: props.vpc_api_cidr,
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

    // Create security groups for a Fargate Service

    // Default SG for inbound traffic

    const defaultSg = new ec2.SecurityGroup(this, 'ApiDefaultSG', {
      securityGroupName: 'api-default-sg-alt',
      vpc: vpc,
    });

    // Add an ingress rule
    defaultSg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80));
    defaultSg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // Egress SG for outbound traffic
    const egressSg = new ec2.SecurityGroup(this, 'ApiEgressSG', {
      securityGroupName: 'api-egress-sg-alt',
      vpc: vpc,
    });

    egressSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // VPE SG for AWS traffic
    const vpeSg = new ec2.SecurityGroup(this, 'ApiVpeSG', {
      securityGroupName: 'api-vpe-sg',
      vpc: vpc,
    });

    vpeSg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));

    // VPC Endpoint to access Secrets Manager
    const secretsManagerEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      'ApiSecretsManagerEndpoint',
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
  */
}
