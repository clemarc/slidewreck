import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const GRAFANA_DIR = join(__dirname, '..', '..', '..', '..', 'grafana');
const DASHBOARDS_DIR = join(GRAFANA_DIR, 'dashboards');
const PROVISIONING_DIR = join(GRAFANA_DIR, 'provisioning', 'dashboards');

describe('Grafana Dashboard Provisioning', () => {
  beforeAll(() => {
    if (!existsSync(GRAFANA_DIR)) {
      throw new Error(
        `Grafana directory not found at ${GRAFANA_DIR}. Ensure grafana/ exists at the project root.`,
      );
    }
  });

  describe('provisioning config', () => {
    const configPath = join(PROVISIONING_DIR, 'dashboards.yaml');
    const raw = readFileSync(configPath, 'utf-8');

    it('has a valid YAML provisioning config with required fields', () => {
      expect(raw).toContain('apiVersion: 1');
      expect(raw).toContain('providers:');
      expect(raw).toContain('type: file');
    });

    it('provisioning config points to correct dashboard path', () => {
      expect(raw).toContain('path: /otel-lgtm/talkforge-dashboards');
    });

    it('provisioning config disables UI updates for dashboard-as-code', () => {
      expect(raw).toContain('allowUiUpdates: false');
    });
  });

  describe('dashboard JSON files', () => {
    const dashboardFiles = readdirSync(DASHBOARDS_DIR).filter((f) =>
      f.endsWith('.json'),
    );

    it('has at least one dashboard JSON file', () => {
      expect(dashboardFiles.length).toBeGreaterThan(0);
    });

    describe.each(dashboardFiles)('%s', (filename) => {
      const filePath = join(DASHBOARDS_DIR, filename);
      const raw = readFileSync(filePath, 'utf-8');
      const dashboard = JSON.parse(raw);

      it('is valid JSON with required fields', () => {
        expect(dashboard).toHaveProperty('uid');
        expect(dashboard).toHaveProperty('title');
        expect(dashboard).toHaveProperty('panels');
        expect(dashboard.panels).toBeInstanceOf(Array);
      });

      it('has id set to null for provisioning', () => {
        expect(dashboard).toHaveProperty('id', null);
      });

      it('has valid schemaVersion', () => {
        expect(dashboard).toHaveProperty('schemaVersion');
        expect(typeof dashboard.schemaVersion).toBe('number');
        expect(dashboard.schemaVersion).toBeGreaterThan(0);
      });

      it('has no duplicate panel IDs', () => {
        const ids = dashboard.panels.map(
          (p: { id: number }) => p.id,
        );
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('every non-row panel has datasource and targets or content', () => {
        const dataPanels = dashboard.panels.filter(
          (p: { type: string }) => p.type !== 'row' && p.type !== 'text',
        );
        for (const panel of dataPanels) {
          expect(panel).toHaveProperty('datasource');
          expect(panel).toHaveProperty('targets');
          expect(panel.targets.length).toBeGreaterThan(0);
        }
      });

      it('every non-row panel has gridPos', () => {
        const nonRowPanels = dashboard.panels.filter(
          (p: { type: string }) => p.type !== 'row',
        );
        for (const panel of nonRowPanels) {
          expect(panel).toHaveProperty('gridPos');
          expect(panel.gridPos).toHaveProperty('x');
          expect(panel.gridPos).toHaveProperty('y');
          expect(panel.gridPos).toHaveProperty('w');
          expect(panel.gridPos).toHaveProperty('h');
        }
      });

      it('uses only Tempo or Prometheus datasources', () => {
        const dataPanels = dashboard.panels.filter(
          (p: { type: string }) =>
            p.type !== 'row' && p.type !== 'text',
        );
        const validDatasources = ['tempo', 'prometheus'];
        for (const panel of dataPanels) {
          expect(validDatasources).toContain(panel.datasource.uid);
        }
      });

      it('queries filter by slidewreck service', () => {
        const dataPanels = dashboard.panels.filter(
          (p: { type: string }) =>
            p.type !== 'row' && p.type !== 'text',
        );
        for (const panel of dataPanels) {
          for (const target of panel.targets) {
            const hasPromFilter =
              target.expr?.includes('service="slidewreck"');
            const hasServiceName =
              target.serviceName === 'slidewreck';
            expect(hasPromFilter || hasServiceName).toBe(true);
          }
        }
      });
    });
  });
});
