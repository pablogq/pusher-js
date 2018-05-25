import Isomorphic from 'isomorphic/runtime';
import xhrAuth from 'isomorphic/auth/xhr_auth';
import xhrTimeline from 'isomorphic/timeline/xhr_timeline';
import { AuthTransports } from 'core/auth/auth_transports';
import { XMLHttpRequest } from 'tns-core-modules/xhr';
import Runtime from '../interface';
import { Network } from './net_info';
import 'nativescript-websockets';

const {
  getDefaultStrategy,
  Transports,
  setup,
  getProtocol,
  isXHRSupported,
  getLocalStorage,
  createXHR,
  createWebSocket,
  addUnloadListener,
  removeUnloadListener,
  transportConnectionInitializer,
  createSocketRequest,
  HTTPFactory
} = Isomorphic;

const NativeScript: Runtime = {
  getDefaultStrategy,
  Transports,
  setup,
  getProtocol,
  isXHRSupported,
  getLocalStorage,
  createXHR,
  createWebSocket,
  addUnloadListener,
  removeUnloadListener,
  transportConnectionInitializer,
  createSocketRequest,
  HTTPFactory,
  TimelineTransport: xhrTimeline,
  getAuthorizers(): AuthTransports {
    return { ajax: xhrAuth };
  },
  getWebSocketAPI() {
    return WebSocket;
  },
  getXHRAPI() {
    return XMLHttpRequest;
  },

  getNetwork() {
    return Network;
  }
};

export default NativeScript;
