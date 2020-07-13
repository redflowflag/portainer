import angular from 'angular';
import _ from 'lodash-es';
import filesizeParser from 'filesize-parser';
import KubernetesResourceReservationHelper from 'Kubernetes/helpers/resourceReservationHelper';
import { KubernetesResourceReservation } from 'Kubernetes/models/resource-reservation/models';
import KubernetesEndpointHelper from 'Kubernetes/endpoint/helper';

class KubernetesClusterController {
  /* @ngInject */
  constructor($async, Authentication, Notifications, KubernetesNodeService, KubernetesApplicationService, KubernetesEndpointService) {
    this.$async = $async;
    this.Authentication = Authentication;
    this.Notifications = Notifications;
    this.KubernetesNodeService = KubernetesNodeService;
    this.KubernetesApplicationService = KubernetesApplicationService;
    this.KubernetesEndpointService = KubernetesEndpointService;

    this.onInit = this.onInit.bind(this);
    this.getNodes = this.getNodes.bind(this);
    this.getNodesAsync = this.getNodesAsync.bind(this);
    this.getApplicationsAsync = this.getApplicationsAsync.bind(this);
    this.getEndpointsAsync = this.getEndpointsAsync.bind(this);
  }

  async getEndpointsAsync() {
    try {
      this.endpoints = await this.KubernetesEndpointService.get();
      this.leader = KubernetesEndpointHelper.getLeader(this.endpoints);
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve endpoints');
    }
  }

  getEndpoints() {
    return this.$async(this.getEndpointsAsync);
  }

  async getNodesAsync() {
    try {
      const nodes = await this.KubernetesNodeService.get();
      _.forEach(nodes, (node) => (node.Memory = filesizeParser(node.Memory)));
      this.nodes = nodes;
      this.CPULimit = _.reduce(this.nodes, (acc, node) => node.CPU + acc, 0);
      this.MemoryLimit = _.reduce(this.nodes, (acc, node) => KubernetesResourceReservationHelper.megaBytesValue(node.Memory) + acc, 0);
      if (this.isAdmin) {
        _.forEach(this.nodes, (node) => (node.IsLeader = node.Name === this.leader));
      }
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve nodes');
    }
  }

  getNodes() {
    return this.$async(this.getNodesAsync);
  }

  async getApplicationsAsync() {
    try {
      this.state.applicationsLoading = true;
      this.applications = await this.KubernetesApplicationService.get();
      const nodeNames = _.map(this.nodes, (node) => node.Name);
      this.resourceReservation = _.reduce(
        this.applications,
        (acc, app) => {
          app.Pods = _.filter(app.Pods, (pod) => nodeNames.includes(pod.Node));
          const resourceReservation = KubernetesResourceReservationHelper.computeResourceReservation(app.Pods);
          acc.CPU += resourceReservation.CPU;
          acc.Memory += resourceReservation.Memory;
          return acc;
        },
        new KubernetesResourceReservation()
      );
      this.resourceReservation.Memory = KubernetesResourceReservationHelper.megaBytesValue(this.resourceReservation.Memory);
    } catch (err) {
      this.Notifications.error('Failure', 'Unable to retrieve applications', err);
    } finally {
      this.state.applicationsLoading = false;
    }
  }

  getApplications() {
    return this.$async(this.getApplicationsAsync);
  }

  async onInit() {
    this.state = {
      applicationsLoading: true,
      viewReady: false,
    };

    this.isAdmin = this.Authentication.isAdmin();

    if (this.isAdmin) {
      await this.getEndpoints();
    }
    await this.getNodes();
    if (this.isAdmin) {
      await this.getApplications();
    }

    this.state.viewReady = true;
  }

  $onInit() {
    return this.$async(this.onInit);
  }
}

export default KubernetesClusterController;
angular.module('portainer.kubernetes').controller('KubernetesClusterController', KubernetesClusterController);
