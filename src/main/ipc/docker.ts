import { ipcMain } from 'electron';

let Docker: any = null;
let dockerInstance: any = null;

try {
  Docker = require('dockerode');
  dockerInstance = new Docker();
} catch (e) {
  console.warn('Dockerode not available:', e);
}

export function registerDockerHandlers(): void {
  // List running containers
  ipcMain.handle('docker:listContainers', async () => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const containers = await dockerInstance.listContainers({ all: true });
      return containers.map((c: any) => ({
        id: c.Id.substring(0, 12),
        names: c.Names.map((n: string) => n.replace(/^\//, '')),
        image: c.Image,
        state: c.State,
        status: c.Status,
        ports: c.Ports.map(
          (p: any) => `${p.PublicPort || ''}:${p.PrivatePort}/${p.Type}`
        ),
      }));
    } catch (error: any) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  });

  // List images
  ipcMain.handle('docker:listImages', async () => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const images = await dockerInstance.listImages();
      return images.map((img: any) => ({
        id: img.Id.substring(0, 19),
        tags: img.RepoTags || [],
        size: img.Size,
        created: img.Created,
      }));
    } catch (error: any) {
      throw new Error(`Failed to list images: ${error.message}`);
    }
  });

  // Build image from Dockerfile
  ipcMain.handle('docker:buildImage', async (_, dockerfilePath: string, tag: string) => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const path = require('path');
      const fs = require('fs');
      const context = path.dirname(dockerfilePath);

      const stream = await dockerInstance.buildImage(
        {
          context,
          src: [path.basename(dockerfilePath)],
        },
        { t: tag }
      );

      return new Promise<void>((resolve, reject) => {
        dockerInstance.modem.followProgress(
          stream,
          (err: any) => {
            if (err) reject(new Error(`Build failed: ${err.message}`));
            else resolve();
          }
        );
      });
    } catch (error: any) {
      throw new Error(`Failed to build image: ${error.message}`);
    }
  });

  // Run a container
  ipcMain.handle('docker:runContainer', async (_, image: string, options?: any) => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const createOptions: any = {
        Image: image,
        name: options?.name,
        Env: options?.env || [],
        HostConfig: {
          Binds: options?.volumes || [],
          PortBindings: {},
        },
        ExposedPorts: {},
      };

      if (options?.ports) {
        for (const [hostPort, containerPort] of Object.entries(options.ports)) {
          createOptions.ExposedPorts[`${containerPort}/tcp`] = {};
          createOptions.HostConfig.PortBindings[`${containerPort}/tcp`] = [
            { HostPort: String(hostPort) },
          ];
        }
      }

      const container = await dockerInstance.createContainer(createOptions);
      await container.start();
      return container.id.substring(0, 12);
    } catch (error: any) {
      throw new Error(`Failed to run container: ${error.message}`);
    }
  });

  // Stop container
  ipcMain.handle('docker:stopContainer', async (_, containerId: string) => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const container = dockerInstance.getContainer(containerId);
      await container.stop();
    } catch (error: any) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  });

  // Remove container
  ipcMain.handle('docker:removeContainer', async (_, containerId: string) => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const container = dockerInstance.getContainer(containerId);
      await container.remove({ force: true });
    } catch (error: any) {
      throw new Error(`Failed to remove container: ${error.message}`);
    }
  });

  // Get container logs
  ipcMain.handle('docker:containerLogs', async (_, containerId: string) => {
    if (!dockerInstance) throw new Error('Docker is not available');
    try {
      const container = dockerInstance.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 200,
      });
      return logs.toString('utf-8');
    } catch (error: any) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  });
}
