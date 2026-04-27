import { describe, it, expect, beforeEach } from 'vitest';
import { ColorLightBulb } from '../src/homekit/services/ColorLightBulb';
import { createMockPlatform, MockAccessory } from './helpers';

describe('ColorLightBulb', () => {
  let service: ColorLightBulb;
  let platform: ReturnType<typeof createMockPlatform>['platform'];
  let handler: ReturnType<typeof createMockPlatform>['handler'];

  beforeEach(() => {
    const mock = createMockPlatform();
    platform = mock.platform;
    handler = mock.handler;
    const accessory = new MockAccessory('Test Light', 'uuid-1');
    accessory.context.device = {
      name: 'Test Light',
      uuidAction: 'light-uuid',
      room: 'Living Room',
    };
    service = new ColorLightBulb(platform as any, accessory as any);
  });

  describe('setOn', () => {
    it('should turn off by setting brightness to 0', async () => {
      service.State.Brightness = 50;
      service.State.On = true;
      await service.setOn(false);
      expect(service.State.Brightness).toBe(0);
      expect(handler.commands.length).toBeGreaterThan(0);
    });

    it('should turn on by restoring brightness to 100 when currently 0', async () => {
      service.State.Brightness = 0;
      service.State.On = false;
      service.State.Hue = 200;
      service.State.Saturation = 80;
      await service.setOn(true);
      expect(service.State.Brightness).toBe(100);
      expect(service.State.On).toBe(true);
      expect(handler.commands.length).toBeGreaterThan(0);
      // Verify a valid hsv() command is sent even when no prior color mode was set
      const lastCmd = handler.commands[handler.commands.length - 1];
      expect(lastCmd.command).toMatch(/^hsv\(/);
    });

    it('should not send command when turning on with brightness already > 0', async () => {
      service.State.Brightness = 50;
      service.State.On = true;
      await service.setOn(true);
      expect(handler.commands.length).toBe(0);
    });
  });

  describe('setBrightness', () => {
    it('should set brightness and update On state', async () => {
      await service.setBrightness(75);
      expect(service.State.Brightness).toBe(75);
      expect(service.State.On).toBe(true);
    });

    it('should set On to false when brightness is 0', async () => {
      await service.setBrightness(0);
      expect(service.State.On).toBe(false);
    });
  });

  describe('setHue', () => {
    it('should set hue and update lastSetMode to color', async () => {
      await service.setHue(120);
      expect(service.State.Hue).toBe(120);
    });
  });

  describe('setSaturation', () => {
    it('should set saturation', async () => {
      await service.setSaturation(80);
      expect(service.State.Saturation).toBe(80);
    });
  });

  describe('setColorTemperature', () => {
    it('should set color temperature', async () => {
      await service.setColorTemperature(300);
      expect(service.State.ColorTemperature).toBe(300);
    });
  });

  describe('updateService', () => {
    it('should parse hsv format correctly', () => {
      service.updateService({ value: 'hsv(120,80,50)' } as any);
      expect(service.State.Hue).toBe(120);
      expect(service.State.Saturation).toBe(80);
      expect(service.State.Brightness).toBe(50);
      expect(service.State.On).toBe(true);
    });

    it('should set On to false for hsv with 0 brightness', () => {
      service.updateService({ value: 'hsv(0,0,0)' } as any);
      expect(service.State.On).toBe(false);
      expect(service.State.Brightness).toBe(0);
    });

    it('should parse temp format correctly', () => {
      service.updateService({ value: 'temp(80,4000)' } as any);
      expect(service.State.Brightness).toBe(80);
      expect(service.State.On).toBe(true);
    });

    it('should handle malformed input gracefully', () => {
      service.updateService({ value: 'invalid' } as any);
      // State should remain unchanged
      expect(service.State.On).toBe(false);
    });
  });

  describe('setColorState sends correct commands', () => {
    it('should send hsv command in color mode', async () => {
      service.State.Hue = 120;
      service.State.Saturation = 80;
      service.State.Brightness = 50;
      await service.setHue(120); // triggers setColorState with lastSetMode='color'
      const lastCmd = handler.commands[handler.commands.length - 1];
      expect(lastCmd.command).toBe('hsv(120,80,50)');
    });

    it('should send temp command in colortemperature mode', async () => {
      service.State.Brightness = 80;
      await service.setColorTemperature(300);
      const lastCmd = handler.commands[handler.commands.length - 1];
      expect(lastCmd.command).toMatch(/^temp\(/);
    });
  });
});
