import text from './top_spending_areas.yaml';

import {
  util_components,
  run_template,
  year_templates,
  StdPanel,
  Col,
  declarative_charts,
  create_text_maker_component,
  table_common,

  declare_panel,
  
  CommonDonut,
} from "../../shared.js";

const {
  is_non_revenue,
  collapse_by_so,
} = table_common;

const { std_years } = year_templates;
const { Format } = util_components;
const { A11YTable } = declarative_charts;

const { text_maker, TM } = create_text_maker_component(text);


const common_cal = (programs,programSobjs) => {

  const cut_off_index = 3;
  const rows_by_so = collapse_by_so(programs, programSobjs, is_non_revenue);

  if ( rows_by_so.length <= 1 || _.every(rows_by_so, ({value}) => value ===0) ) {
    return false;
  }

  const top_3_sos = _.take(rows_by_so, cut_off_index);
  const remainder = top_3_sos.length > cut_off_index -1 ? 
    {
      label: text_maker("other"), 
      value: d3.sum( _.tail(rows_by_so, cut_off_index), _.property("value") ),
    } : 
    [];

  return top_3_sos.concat(remainder);
};


const render_w_options = ({text_key}) => ({calculations, footnotes, sources}) => {
  const { panel_args, info } = calculations;
  const { top_3_sos_and_remainder } = panel_args;

  const graph_data = panel_args.map(d => ({
    label: d["label"],
    id: d["label"],
    value: d["value"],
  }));
  
  return (
    <StdPanel
      title={text_maker("top_spending_areas_title")}
      {...{footnotes, sources}}
    >
      <Col isText size={5}>
        <TM k={text_key} args={info} />
      </Col>
      <Col 
        isGraph={!window.is_a11y_mode}
        size={7}
      >
        { window.is_a11y_mode ?
          <A11YTable
            {...{
              data: _.map(top_3_sos_and_remainder, ({label, value}) => ({
                label,
                data: <Format type="compact1_written" content={value} />,
              })),
              label_col_header: text_maker("so"),
              data_col_headers: [ `${run_template(_.last(std_years))} ${text_maker("spending")}` ],
            }}
          /> : 
          <CommonDonut
            graph_data = {graph_data}
            legend_data = {graph_data}
            graph_height = '450px'
          />
        }
      </Col>
    </StdPanel>
  );
};


export const declare_top_spending_areas_panel = () => declare_panel({
  panel_key: "top_spending_areas",
  levels: ["program"],
  panel_config_func: (level, panel_key) => ({
    depends_on: ['programSobjs'],
    info_deps: ["program_std_obj"],
    footnotes: ["SOBJ"],
    calculate(subject,info,options){ 
      if ( _.isEmpty( this.tables.programSobjs.programs.get(subject) ) ){
        return false;
      }
      return common_cal([subject], this.tables.programSobjs);
    },
    render: render_w_options({text_key: "program_top_spending_areas_text"}),
  }),
});
