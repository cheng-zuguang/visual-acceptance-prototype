import { useMemo, useState } from "react";
import { ChevronDown, Code2 } from "lucide-react";
import { buildAgentMatchingDiagnosticsModel } from "./agent-matching-diagnostics";
import type { Translate } from "./i18n";
import type {
  DynamicFallbackReasonCode,
  SemanticAgentMatchingEvidence
} from "./types";

export function AgentMatchingDiagnosticsCard(props: {
  evidence: SemanticAgentMatchingEvidence | undefined;
  t: Translate;
}) {
  const [moduleId, setModuleId] = useState("all");
  const [reasonCode, setReasonCode] = useState<"all" | DynamicFallbackReasonCode>("all");
  const model = useMemo(
    () => buildAgentMatchingDiagnosticsModel(props.evidence, { moduleId, reasonCode }),
    [props.evidence, moduleId, reasonCode]
  );

  if (!model.visible) return null;

  return (
    <details className="agent-diagnostics-card">
      <summary>
        <span className="agent-diagnostics-summary-icon" aria-hidden="true"><Code2 size={18} /></span>
        <span className="agent-diagnostics-summary-copy">
          <b>{props.t("report.agentDiagnostics.title")}</b>
          <small>{props.t("report.agentDiagnostics.help")}</small>
        </span>
        <span className="agent-diagnostics-summary-count">{model.filteredDecisionCount}</span>
        <ChevronDown className="agent-diagnostics-chevron" size={17} aria-hidden="true" />
      </summary>
      <div className="agent-diagnostics-body">
        {props.evidence?.execution && <pre><code>{JSON.stringify(props.evidence.execution, null, 2)}</code></pre>}
        <dl className="agent-diagnostics-totals">
          <div className={model.invoked ? "positive" : "negative"}>
            <dt>{model.invoked
              ? props.t("report.agentDiagnostics.invoked")
              : props.t("report.agentDiagnostics.notInvoked")}</dt>
            <dd>{model.responded
              ? props.t("report.agentDiagnostics.responded")
              : props.t("report.agentDiagnostics.noResponse")}</dd>
          </div>
          <div><dt>{props.t("report.agentDiagnostics.bindings")}</dt><dd>{model.acceptedBindingCount}</dd></div>
          <div><dt>{props.t("report.agentDiagnostics.evaluated")}</dt><dd>{model.totals.evaluated}</dd></div>
          <div className="positive"><dt>{props.t("report.agentDiagnostics.accepted")}</dt><dd>{model.totals.accepted}</dd></div>
          <div className="negative"><dt>{props.t("report.agentDiagnostics.rejected")}</dt><dd>{model.totals.rejected}</dd></div>
        </dl>

        <div className="agent-diagnostics-filters">
          <span>
            <label htmlFor="agent-diagnostics-module">{props.t("report.agentDiagnostics.moduleFilter")}</label>
            <select
              id="agent-diagnostics-module"
              value={moduleId}
              onChange={(event) => setModuleId(event.currentTarget.value)}
            >
              <option value="all">{props.t("report.agentDiagnostics.moduleAll")}</option>
              {model.moduleOptions.map((module) => <option key={module} value={module}>{module}</option>)}
            </select>
          </span>
          <span>
            <label htmlFor="agent-diagnostics-reason">{props.t("report.agentDiagnostics.reasonFilter")}</label>
            <select
              id="agent-diagnostics-reason"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.currentTarget.value as "all" | DynamicFallbackReasonCode)}
            >
              <option value="all">{props.t("report.agentDiagnostics.reasonAll")}</option>
              {model.reasonOptions.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </span>
        </div>

        {model.modules.length > 0 ? (
          <>
            <section className="agent-diagnostics-modules" aria-label={props.t("report.agentDiagnostics.moduleStatus")}>
              {model.modules.map(({ state, decisions }) => (
                <article key={state.designModuleId}>
                  <header>
                    <code>{state.designModuleId}</code>
                    <span>{props.t("report.agentDiagnostics.bindings")} <b>{state.acceptedBindingCount}</b></span>
                  </header>
                  <dl>
                    <div><dt>{props.t("report.agentDiagnostics.evaluated")}</dt><dd>{state.dynamicFallback.evaluatedCount}</dd></div>
                    <div><dt>{props.t("report.agentDiagnostics.accepted")}</dt><dd>{state.dynamicFallback.acceptedCount}</dd></div>
                    <div><dt>{props.t("report.agentDiagnostics.rejected")}</dt><dd>{state.dynamicFallback.rejectedCount}</dd></div>
                  </dl>
                  <p>
                    <span>{props.t("report.agentDiagnostics.parentContainers")}</span>
                    {state.actualParentSelectors.length > 0
                      ? state.actualParentSelectors.map((selector) => <code key={selector}>{selector}</code>)
                      : <small>{props.t("report.agentDiagnostics.noParentContainers")}</small>}
                  </p>
                  {decisions.length === 0 && <small>{props.t("report.agentDiagnostics.noDecisions")}</small>}
                </article>
              ))}
            </section>

            {model.filteredDecisionCount > 0 && (
              <section className="agent-diagnostics-decisions">
                <h3>{props.t("report.agentDiagnostics.decisions")} <span>{model.filteredDecisionCount}</span></h3>
                <div className="agent-diagnostics-table-scroll">
                  <table>
                    <caption className="visually-hidden">{props.t("report.agentDiagnostics.tableCaption")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{props.t("report.agentDiagnostics.module")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.result")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.reasonCode")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.figmaNode")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.actualSelector")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.parentSelector")}</th>
                        <th scope="col">{props.t("report.agentDiagnostics.matched")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.modules.flatMap(({ state, decisions }) => decisions.map((decision, index) => (
                        <tr key={`${state.designModuleId}:${decision.figmaNodeId}:${decision.selector}:${index}`}>
                          <td><code>{state.designModuleId}</code></td>
                          <td><span className={`agent-decision-result ${decision.result}`}>{props.t(`report.agentDiagnostics.${decision.result}`)}</span></td>
                          <td><code>{decision.reasonCode}</code></td>
                          <td><code>{decision.figmaNodeId}</code></td>
                          <td><code>{decision.selector}</code></td>
                          <td>{decision.actualParentSelector ? <code>{decision.actualParentSelector}</code> : "—"}</td>
                          <td>{decision.matched
                            ? props.t("report.agentDiagnostics.yes")
                            : props.t("report.agentDiagnostics.no")}</td>
                        </tr>
                      ))) }
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : <p className="agent-diagnostics-empty">{props.t("report.agentDiagnostics.empty")}</p>}
      </div>
    </details>
  );
}
