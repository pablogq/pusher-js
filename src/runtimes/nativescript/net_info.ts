import * as connectivity from 'tns-core-modules/connectivity';
import EventDispatcher from 'core/events/dispatcher';
import Util from 'core/util';
import Reachability from 'core/reachability';

function hasOnlineConnection(state): boolean {
  return state !== connectivity.connectionType.none;
}

export class NetInfo extends EventDispatcher implements Reachability {
  online: boolean;

  constructor() {
    super();

    this.online = hasOnlineConnection(connectivity.getConnectionType());

    this.onConnectivityChange = this.onConnectivityChange.bind(this);
    connectivity.startMonitoring(this.onConnectivityChange);
  }

  isOnline(): boolean {
    return this.online;
  }

  private onConnectivityChange(status) {
    const current = hasOnlineConnection(status);
    if (current === this.online) return;

    this.online = current;
    const event = current ? 'online' : 'offline';
    this.emit(event);
  }
}

export const Network = new NetInfo();
