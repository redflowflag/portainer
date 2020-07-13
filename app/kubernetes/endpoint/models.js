/**
 * KubernetesEndpoint Model
 */
const _KubernetesEndpoint = Object.freeze({
  Id: '',
  Name: '',
  Namespace: '',
  HolderIdentity: '',
});

export const KubernetesEndpointAnnotationLeader = 'control-plane.alpha.kubernetes.io/leader';

export class KubernetesEndpoint {
  constructor() {
    Object.assign(this, JSON.parse(JSON.stringify(_KubernetesEndpoint)));
  }
}
