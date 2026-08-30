/**
 * Collaboration room over WebSocket.
 *
 * Tracks who is editing a project and relays graph deltas between them.
 * Presence is authoritative here (the server owns the room roster); conflict
 * resolution stays last-write-wins until a CRDT is introduced.
 */

import { Elysia } from 'elysia';

/** An editor currently connected to a project room. */
export interface Collaborator {
  id: string;
  name: string;
  color: string;
}

/** Wire messages the room emits. */
export type CollabMessage =
  | { type: 'presence'; collaborators: Collaborator[] }
  | { type: 'delta'; from: string; payload: unknown };

/** projectId -> connectionId -> collaborator. */
const rooms = new Map<string, Map<string, Collaborator>>();

/** Distinct colours so avatars stay tellable apart at a glance. */
const PALETTE = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#60a5fa'];

function colourFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function send(ws: { publish: (topic: string, data: string) => void }, projectId: string, message: CollabMessage): void {
  ws.publish(projectId, JSON.stringify(message));
}

function presence(ws: { publish: (topic: string, data: string) => void }, projectId: string): void {
  const room = rooms.get(projectId);
  send(ws, projectId, {
    type: 'presence',
    collaborators: room ? [...room.values()] : [],
  });
}

export const collabRoute = new Elysia().ws('/collab/:projectId', {
  open(ws) {
    const projectId = String((ws.data as { params: { projectId: string } }).params.projectId);
    let room = rooms.get(projectId);
    if (!room) {
      room = new Map();
      rooms.set(projectId, room);
    }
    room.set(ws.id, {
      id: ws.id,
      name: `编辑者 ${room.size + 1}`,
      color: colourFor(ws.id),
    });
    ws.subscribe(projectId);
    presence(ws, projectId);
  },

  message(ws, message) {
    const projectId = String((ws.data as { params: { projectId: string } }).params.projectId);
    // Relay the delta to everyone else; the originator already applied it.
    send(ws, projectId, { type: 'delta', from: ws.id, payload: message });
  },

  close(ws) {
    const projectId = String((ws.data as { params: { projectId: string } }).params.projectId);
    const room = rooms.get(projectId);
    if (!room) return;
    room.delete(ws.id);
    if (room.size === 0) {
      rooms.delete(projectId);
    }
    presence(ws, projectId);
  },
});

/** Visible for tests. */
export const __rooms = rooms;
