import text from './tp_by_region.yaml';
import {
  formats,
  run_template,
  declare_panel,
  year_templates,
  businessConstants,
  create_text_maker_component,
  StdPanel,
  Col,
  declarative_charts,
} from "../../shared.js";
import { Canada } from '../../../../charts/canada/index.js';

const { std_years } = year_templates;
const formatter = formats["compact2_raw"];

const { text_maker, TM } = create_text_maker_component(text);
const { provinces, provinces_with_article } = businessConstants;
const { A11YTable } = declarative_charts;

const calculate_common = (subject, table) => {
  const level = subject.level;

  if ( level === 'dept' && !_.has(table.depts , subject.id) ){
    return false;
  }

  const data = std_years.map( year => table.prov_code(year, level === "gov" ? false : subject.id) );
  
  const max = _.chain(data)
    .last()
    .values()
    .max()
    .value();
  const color_scale = d3.scaleLinear()
    .domain([0, max])
    .range([0.2, 1]);

  return max > 0 && {
    data,
    color_scale,
    years: std_years,
    formatter,
  };
};

const prepare_data_for_a11y_table = (data) =>
  _.chain(provinces)
    .map((province, prov_code) => {
      if( !_.includes(["onlessncr", "qclessncr", "ncr"], prov_code)){
        const formatted_yearly_tp = _.map(
          data, 
          (row) => formats["compact2_written_raw"](row[prov_code])
        );

        return {
          label: province.text,
          data: formatted_yearly_tp,
        };
      }
    })
    .filter((data) => !_.isUndefined(data))
    .value();

export const declare_tp_by_region_panel = () => declare_panel({
  panel_key: "tp_by_region",
  levels: ["gov", "dept"],
  panel_config_func: (level, panel_key) => ({
    depends_on: ['orgTransferPaymentsRegion'],
    calculate: function(subject, info, options){
      const { orgTransferPaymentsRegion } = this.tables;
      return calculate_common(subject, orgTransferPaymentsRegion);
    },
    
    render(render_args){
      const {
        calculations,
        footnotes,
        sources,
      } = render_args;
      const { panel_args } = calculations;
      const { data } = panel_args;
      const current_year_data = _.last(data);

      const largest_prov = _.chain(current_year_data)
        .keys()
        .maxBy( (prov) => current_year_data[prov] )
        .value();
      const total_sum = _.reduce(
        current_year_data,
        (sum, value) => sum += value,
        0
      );
      const percent_of_total = current_year_data[largest_prov] / total_sum;
      const text_args = {
        largest_prov: provinces_with_article[largest_prov].text,
        total_sum: formatter(total_sum),
        percent_of_total: formats["percentage1_raw"](percent_of_total),
        subject: calculations.subject,
      };

      return (
        <StdPanel
          title={text_maker("tp_by_region_title")}
          {...{footnotes, sources}}
        >
          <Col size={12} isText>
            <TM k="tp_by_region_text" args={text_args}/>
          </Col>
          { !window.is_a11y_mode &&
            <Col size={12} isGraph>
              <Canada
                graph_args={panel_args}
              />
            </Col>
          }
          { window.is_a11y_mode &&
            <Col size={12} isGraph>
              <A11YTable
                label_col_header={text_maker("prov")}
                data_col_headers={_.map( std_years, y => run_template(y) )}
                data={prepare_data_for_a11y_table(data)}
              />
            </Col>
          }
        </StdPanel>
      );
        
    },
  }),
});