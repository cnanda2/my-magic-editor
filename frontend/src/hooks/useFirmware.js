import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

export function useFirmware() {
  const { socket } = useSocket();
  const [boards, setBoards] = useState([]);
  const [tools, setTools] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    axios.get('/api/firmware/boards').then((res) => setBoards(res.data)).catch(() => {});
    axios.get('/api/firmware/tools').then((res) => setTools(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onProgress = (p) => setProgress(typeof p === 'number' ? p : p.percent ?? 0);
    const onComplete = () => {
      setUploading(false);
      setProgress(100);
    };
    const onError = () => {
      setUploading(false);
      setProgress(0);
    };

    socket.on('upload_progress', onProgress);
    socket.on('upload_complete', onComplete);
    socket.on('upload_error', onError);

    return () => {
      socket.off('upload_progress', onProgress);
      socket.off('upload_complete', onComplete);
      socket.off('upload_error', onError);
    };
  }, [socket]);

  const upload = useCallback(
    ({ boardType, port, firmwarePath }) => {
      setUploading(true);
      setProgress(0);
      socket?.emit('upload_firmware', { boardType, port, firmwarePath });
    },
    [socket],
  );

  return { boards, tools, uploading, progress, upload };
}

export default useFirmware;
