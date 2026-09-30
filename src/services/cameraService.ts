import { CameraState } from '../types';

export class CameraService {
  private stream: MediaStream | null = null;

  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
      return [];
    }
  }

  public async startStream(deviceId?: string): Promise<MediaStream> {
    this.stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Webcam API is not supported in this browser.');
    }

    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: 'user',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 },
          },
      audio: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  public stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  public isStreaming(): boolean {
    return Boolean(this.stream && this.stream.active && this.stream.getVideoTracks().some((t) => t.readyState === 'live'));
  }
}

export const cameraService = new CameraService();
