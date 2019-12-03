import './results.scss';

import {
  Subject,
  declare_panel,
  InfographicPanel,
  get_source_links,
  create_text_maker_component,
} from "../shared.js";
const { Dept } = Subject;
import text from './results_intro_text.yaml';
import { get_static_url } from '../../../request_utils.js';
import { 
  ResultCounts,
  get_result_doc_keys,
  result_docs,
} from './results_common.js';

const { text_maker, TM } = create_text_maker_component(text);


const latest_drr_doc_key = _.last( get_result_doc_keys("drr") );
const latest_dp_doc_key = _.last( get_result_doc_keys("dp") );

const ResultsIntroPanel = ({subject, is_gov, summary_result_counts, doc_urls}) => {
  const summary_text_args = {subject, is_gov, ...summary_result_counts};
  
  return (
    <div className="frow middle-xs">
      <div className="fcol-md-7 medium_panel_text">
        <TM k="results_intro_text" />
      </div>
      {!window.is_a11y_mode &&
        <div className="fcol-md-5">
          <div
            style={{
              padding: "20px",
            }}
          >
            <img
              src={get_static_url(`png/result-taxonomy-${window.lang}.png`)} 
              style={{
                width: "100%",
                maxHeight: "500px",
              }}
            />
          </div>
        </div>
      }
      <div className="fcol-md-12 medium_panel_text">
        <TM k="dp_summary_text" args={summary_text_args} />
        <TM k="drr_summary_text" args={summary_text_args} />
        {summary_result_counts.drr_results > 0 && <TM k="reports_links_text" args={doc_urls} />}
      </div>
    </div>
  );
};

export const declare_results_intro_panel = () => declare_panel({
  panel_key: "results_intro",
  levels: ["gov", "dept"],
  panel_config_func: (level, panel_key) => ({
    requires_granular_result_counts: true,
    footnotes: ["RESULTS_COUNTS", "RESULTS"],
    source: (subject) => get_source_links(["DP","DRR"]),
    calculate: (subject) => {

      const is_gov = subject.level == 'gov';

      const verbose_counts = (() => {
        if(is_gov){
          const dept_counts = ResultCounts.get_all_dept_counts();
          const counts_by_dept = _.chain(dept_counts)
            .map( row => ({
              subject: Dept.lookup(row.id),
              counts: row,
            }))
            .map( obj => ({...obj, total: d3.sum(_.values(obj.counts)) } ) )
            .value();
          const gov_counts = _.mergeWith({}, ...dept_counts, (val, src) => _.isNumber(val) ? val + src : src);
          const depts_with_dps = _.sumBy(counts_by_dept, dept => dept.counts[`${latest_dp_doc_key}_results`] > 0 ? 1 : 0);
          const depts_with_drrs = _.sumBy(counts_by_dept, dept => dept.counts[`${latest_drr_doc_key}_results`] > 0 ? 1 : 0);
          return {
            depts_with_dps,
            depts_with_drrs,
            ...(_.omit(gov_counts, ['id','level','subject_id'])),
          };
        } else {
          return {
            num_crs: _.size(subject.crsos),
            num_programs: _.reduce(subject.crsos, (sum,crso) => sum+_.size(crso.programs), 0),
            ...ResultCounts.get_dept_counts(subject.id),
          };
        }
      })();

      if(verbose_counts[`${latest_dp_doc_key}_results`] < 1){
        return false;
      }

      const summary_result_counts = {
        dp_results: verbose_counts[`${latest_dp_doc_key}_results`],
        dp_indicators: verbose_counts[`${latest_dp_doc_key}_indicators`],
        drr_results: verbose_counts[`${latest_drr_doc_key}_results`],
        drr_indicators: verbose_counts[`${latest_drr_doc_key}_total`],
        num_crs: is_gov ? false : verbose_counts.num_crs,
        num_programs: is_gov ? false : verbose_counts.num_programs,
        depts_with_dps: is_gov ? verbose_counts.depts_with_dps : false,
        depts_with_drrs: is_gov ? verbose_counts.depts_with_drrs : false,
      };

      const doc_urls = {
        dp_url: result_docs[latest_dp_doc_key][`doc_url_${window.lang}`],
        drr_url: result_docs[latest_drr_doc_key][`doc_url_${window.lang}`],
      };

      return {
        subject,
        is_gov,
        summary_result_counts,
        doc_urls,
      };
    },
    render({ calculations, sources}){
      const {
        panel_args,
      } = calculations;
  
      return (
        <InfographicPanel
          title={text_maker("results_intro_title")}
          sources={sources}
        >
          <ResultsIntroPanel
            {...panel_args}
          />
        </InfographicPanel>
      ); 
    },
  }),
});