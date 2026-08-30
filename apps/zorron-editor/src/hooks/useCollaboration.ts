/**
 * Collaboration presence over WebSocket.
 *
 * Best-effort by design: if the socket cannot be opened (offline, no WS
 * support, server without the collab route) the editor simply carries on
 * without collaborators rather than surfacing an error.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
}

interface PresenceFrame {
  type: 'presence';
  collaborators: Collaborator[];
}

export interface UseCollaborationResult {
  /** Everyone currently in the room, including this client. */
  collaborators: Collaborator[];
  connected: boolean;
  /** Send a graph delta to the rest of the room. */
  broadcast: (payload: unknown) => void;
}

export function useCollaboration(projectId: string | null): UseCollaborationResult {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${protocol}//${window.location.host}/collab/${projectId}`);
    } catch {
      // Collaboration is a nice-to-have; never block editing on it.
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => {
      setConnected(false);
      setCollaborators([]);
    };
    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data)) as PresenceFrame;
        if (frame.type === 'presence' && Array.isArray(frame.collaborators)) {
          setCollaborators(frame.collaborators);
        }
      } catch {
        // Malformed frames are dropped.
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [projectId]);

  const broadcast = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  return { collaborators, connected, broadcast };
}
