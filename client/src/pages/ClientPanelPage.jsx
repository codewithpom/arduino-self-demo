import React, { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL);

// Helper component for the buttons to avoid repetition
const GroupButton = ({ group, socketId, lock, onLock, onUnlock }) => {
    const isLockedByMe = lock === socketId;
    const isLockedByOther = lock && lock !== socketId;
  
    const handleClick = () => {
      if (isLockedByMe) {
        onUnlock(group);
      } else if (!lock) {
        onLock(group);
      }
    };
  
    const buttonText = useMemo(() => {
      if (isLockedByMe) return `Unlock Group ${group}`;
      if (isLockedByOther) return `Group ${group} Locked`;
      return `Lock Group ${group}`;
    }, [group, isLockedByMe, isLockedByOther]);

    const baseClasses = "px-8 py-4 text-xl font-semibold text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200";
    const colorClasses = {
        A: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        B: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
        C: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500',
    };
    const lockedByMeClasses = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
  
    return (
      <button
        onClick={handleClick}
        disabled={isLockedByOther}
        className={`${baseClasses} ${isLockedByMe ? lockedByMeClasses : colorClasses[group]} ${isLockedByOther ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {buttonText}
      </button>
    );
};


export default function ClientPanelPage() {
  const [ledState, setLedState] = useState(Array(8).fill(false));
  const [groupLocks, setGroupLocks] = useState({ A: null, B: null, C: null });
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const onConnect = () => {
        console.log('Connected to server with ID:', socket.id);
        setSocketId(socket.id);
    };

    const onStateUpdate = (newState) => setLedState(newState);
    const onLocksUpdate = (newLocks) => setGroupLocks(newLocks);

    socket.on('connect', onConnect);
    socket.on('state_update', onStateUpdate);
    socket.on('locks_update', onLocksUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('state_update', onStateUpdate);
      socket.off('locks_update', onLocksUpdate);
    };
  }, []);

  const handleLockGroup = (group) => socket.emit('lock_group', group);
  const handleUnlockGroup = (group) => socket.emit('unlock_group', group);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-xl text-center">
        <h1 className="text-4xl font-bold mb-4">Smart Chart Control</h1>
        <p className="text-gray-600 mb-8">Lock a group to activate the LEDs and audio description.</p>

        {/* LED Status Display */}
        <div className="flex justify-center space-x-2 mb-8">
          {ledState.map((isOn, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full transition-colors duration-300 ${
                  isOn ? 'bg-green-500 shadow-lg' : 'bg-gray-300'
                }`}
              ></div>
              <span className="mt-2 text-xs text-gray-500">{index + 1}</span>
            </div>
          ))}
        </div>

        {/* Group Selection Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GroupButton group="A" socketId={socketId} lock={groupLocks.A} onLock={handleLockGroup} onUnlock={handleUnlockGroup} />
          <GroupButton group="B" socketId={socketId} lock={groupLocks.B} onLock={handleLockGroup} onUnlock={handleUnlockGroup} />
          <GroupButton group="C" socketId={socketId} lock={groupLocks.C} onLock={handleLockGroup} onUnlock={handleUnlockGroup} />
        </div>
      </div>
    </div>
  );
}
