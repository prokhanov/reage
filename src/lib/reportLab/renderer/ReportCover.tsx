import type { ProkhanovReport } from "../types";
import {
  buildCoverVars,
  DEFAULT_COVER_TEMPLATE,
  renderTemplateVars,
  type CoverBlock,
  type CoverTemplate,
} from "../coverTemplate";
import logoLight from "@/assets/reage-logo-light.png";

interface Props {
  report: ProkhanovReport;
  template?: CoverTemplate;
}

function blockStyle(
  block: CoverBlock,
  defaults: { textColor: string },
): React.CSSProperties {
  return {
    marginTop: `${block.marginTopMm}mm`,
    fontSize: `${block.fontSizePt}pt`,
    fontWeight: block.fontWeight,
    textAlign: block.align,
    fontStyle: block.italic ? "italic" : "normal",
    color: block.color || defaults.textColor,
    fontFamily:
      block.fontFamily === "serif"
        ? "var(--font-serif)"
        : "var(--font-sans)",
    textTransform: block.eyebrow ? "uppercase" : "none",
    letterSpacing: block.eyebrow ? "0.22em" : "normal",
    lineHeight: 1.15,
    padding: "0 20mm",
    whiteSpace: "pre-wrap",
  };
}

function renderBlock(
  block: CoverBlock,
  vars: Record<string, string>,
  defaults: { textColor: string },
) {
  const text = renderTemplateVars(block.text, vars).trim();
  if (!text) return null;
  return <div style={blockStyle(block, defaults)}>{text}</div>;
}

export function ReportCover({ report, template = DEFAULT_COVER_TEMPLATE }: Props) {
  const vars = buildCoverVars(report);
  const defaults = { textColor: template.textColor };

  const bg = template.bgGradient
    ? `${template.bgGradient}, ${template.bgColor}`
    : template.bgColor;

  return (
    <div
      className="rl-page rl-cover"
      style={{
        background: bg,
        color: template.textColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      {template.logoEnabled && (
        <div
          style={{
            marginTop: `${template.logoMarginTopMm}mm`,
            textAlign: "center",
          }}
        >
          <img
            src={logoLight}
            alt="ReAge"
            style={{
              width: `${template.logoWidthMm}mm`,
              height: "auto",
              display: "inline-block",
            }}
          />
        </div>
      )}

      {renderBlock(template.eyebrow, vars, defaults)}
      {renderBlock(template.title, vars, defaults)}
      {renderBlock(template.subtitle, vars, defaults)}
      {renderBlock(template.patient, vars, defaults)}
      {renderBlock(template.date, vars, defaults)}
      {renderBlock(template.metaLine, vars, defaults)}

      <div style={{ flex: 1 }} />

      <div style={{ paddingBottom: "18mm" }}>
        {renderBlock(template.footer, vars, defaults)}
      </div>
    </div>
  );
}
