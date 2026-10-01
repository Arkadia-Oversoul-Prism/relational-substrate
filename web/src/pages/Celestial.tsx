import * as ep from "../api/endpoints";
import { usePolling } from "../lib/hooks";
import { Card, ErrorBanner, Kv, Loading, Pill, Stat } from "../components/ui";
import { fmtTime } from "../lib/format";

interface Band { hz: number; name: string }
interface Lunar { phase: string; glyph: string; meaning: string; illumination_pct: number; moon_name: string; age_days: number }
interface Body { sign: string; glyph: string; meaning: string; longitude: number }
interface Cosmic { solar_wind_kms: number; kp_index: number; solar_flux: number; geomagnetic_pressure: string; mood: string }
interface BlindPull { transmission: string; pull_index: number; method: string }
interface Volume { volume: string; title: string; domain: string }

export function Celestial() {
  const stellar = usePolling(() => ep.stellar(), 20000);
  const d = stellar.data;

  if (stellar.loading && !d) return <Loading />;
  if (stellar.error && !d) return <ErrorBanner error={stellar.error} />;
  if (!d) return null;

  const ark = d.ark_date;
  const schumann = d.schumann as { bands: Band[]; dominant_hz?: number; dominant_name?: string; quality?: string } | undefined;
  const lunar = d.lunar as Lunar | undefined;
  const planetary = d.planetary as { bodies: Record<string, Body> } | undefined;
  const cosmic = d.cosmic_weather as Cosmic | undefined;
  const pull = d.oversoul_blind_pull as BlindPull | undefined;
  const galactica = d.galactica as { volumes: Volume[] } | undefined;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Ark date" actions={ark && <Pill tone="info">{ark.display}</Pill>}>
        {ark && (
          <>
            <div className="grid cols-4">
              <Stat label="Ark year" value={`${ark.ark_year}/${ark.ark_total_years}`} sub={`${ark.ark_completion_pct}% complete`} />
              <Stat label="Day in year" value={ark.day_in_year} sub={`total day ${ark.total_ark_day}`} />
              <Stat label="Pulse" value={ark.pulse} sub={`breath ${ark.breath}`} />
              <Stat label="Coordinate" value={<span style={{ fontSize: 16 }}>{ark.coordinate}</span>} />
            </div>
            <div className="mt">
              <Kv items={[["epoch", ark.epoch], ["linear utc", fmtTime(ark.linear_utc)], ["note", ark.linear_note]]} />
            </div>
          </>
        )}
      </Card>

      <div className="grid cols-2">
        <Card title="Schumann resonance" actions={schumann?.quality && <Pill tone="muted">{schumann.quality}</Pill>}>
          {schumann?.dominant_hz !== undefined && (
            <div className="mb">
              <Stat label="Dominant" value={`${schumann.dominant_hz} Hz`} sub={schumann.dominant_name} />
            </div>
          )}
          {schumann && schumann.bands.length > 0 ? (
            <div className="grid" style={{ gap: 8 }}>
              {schumann.bands.map((b) => (
                <div key={b.hz} className="row between" style={{ gap: 8, borderBottom: "1px solid var(--line-soft)", paddingBottom: 6 }}>
                  <span className="mono" style={{ color: "var(--cyan)" }}>{b.hz} Hz</span>
                  <span className="small faint right">{b.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="small faint">No band data returned.</span>
          )}
        </Card>

        <div className="grid" style={{ gap: 16 }}>
          <Card title="Lunar" actions={lunar && <Pill tone="info">{lunar.phase}</Pill>}>
            {lunar ? (
              <>
                <div className="row" style={{ gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 34 }}>{lunar.glyph}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{lunar.moon_name}</div>
                    <div className="small faint">{lunar.meaning}</div>
                  </div>
                </div>
                <div className="mt">
                  <Kv items={[["illumination", `${lunar.illumination_pct}%`], ["age", `${lunar.age_days} days`]]} />
                </div>
              </>
            ) : (
              <span className="small faint">No lunar data.</span>
            )}
          </Card>

          <Card title="Cosmic weather">
            {cosmic ? (
              <>
                <div className="grid cols-3">
                  <Stat label="Kp index" value={cosmic.kp_index} />
                  <Stat label="Solar wind" value={`${cosmic.solar_wind_kms}`} sub="km/s" />
                  <Stat label="Solar flux" value={cosmic.solar_flux} />
                </div>
                <div className="mt">
                  <Pill tone="warn">{cosmic.geomagnetic_pressure}</Pill>
                  <div className="small dim mt">{cosmic.mood}</div>
                </div>
              </>
            ) : (
              <span className="small faint">No cosmic weather.</span>
            )}
          </Card>
        </div>
      </div>

      <Card title="Planetary positions" actions={planetary && <Pill tone="muted">{Object.keys(planetary.bodies).length} bodies</Pill>}>
        {planetary ? (
          <div className="grid cols-4">
            {Object.entries(planetary.bodies).map(([name, b]) => (
              <div key={name} className="card" style={{ background: "var(--bg-inset)" }}>
                <div className="row between">
                  <span className="small" style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: 18 }}>{b.glyph}</span>
                </div>
                <div className="mono" style={{ color: "var(--violet)", marginTop: 4 }}>{b.sign}</div>
                <div className="tiny faint mt">{b.meaning}</div>
                <div className="tiny faint mono mt">{b.longitude.toFixed(2)}°</div>
              </div>
            ))}
          </div>
        ) : (
          <span className="small faint">No planetary data.</span>
        )}
      </Card>

      <div className="grid cols-2">
        <Card title="Oversoul blind pull" actions={pull && <Pill tone="muted">index {pull.pull_index}</Pill>}>
          {pull ? (
            <>
              <blockquote style={{ margin: 0, fontStyle: "italic", color: "var(--ink-dim)", lineHeight: 1.6 }}>{pull.transmission}</blockquote>
              <div className="tiny faint mt">{pull.method}</div>
            </>
          ) : (
            <span className="small faint">No pull returned.</span>
          )}
        </Card>

        <Card title="Galactica volumes" actions={galactica && <Pill tone="muted">{galactica.volumes.length} volumes</Pill>}>
          {galactica ? (
            <div className="grid" style={{ gap: 8 }}>
              {galactica.volumes.map((v) => (
                <div key={v.volume} className="row" style={{ gap: 12, borderBottom: "1px solid var(--line-soft)", paddingBottom: 6 }}>
                  <span className="mono" style={{ color: "var(--ember)", minWidth: 34 }}>{v.volume}</span>
                  <div>
                    <div className="small" style={{ fontWeight: 500 }}>{v.title}</div>
                    <div className="tiny faint">{v.domain}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="small faint">No galactica data.</span>
          )}
        </Card>
      </div>

      <Card title="Full readout">
        <pre className="json">{JSON.stringify(d, null, 2)}</pre>
      </Card>
    </div>
  );
}
