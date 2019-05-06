import "./budget_measures_panel.scss";
import text1 from "./budget_measures_panel.yaml";
import text2 from "../../partition/budget_measures_subapp/BudgetMeasuresRoute.yaml";
import {
  formats,
  PanelGraph,
  Subject,
  businessConstants,
  util_components,
  declarative_charts,
  create_text_maker_component,
  Panel,
  NivoResponsiveHBar,
} from "../shared";

import { lightCategory10Colors } from '../../core/color_schemes.js';

import { ensure_loaded } from '../../core/lazy_loader.js';

import { infograph_href_template } from '../../link_utils.js';

import { Fragment } from 'react';

const { budget_values } = businessConstants;

const { 
  BudgetMeasure,
  Dept,
  Program,
  CRSO,
} = Subject;

const { 
  budget_years, 
  budget_data_source_dates,
  main_estimates_budget_links,
} = BudgetMeasure;

const {
  Select,
  Format,
  TabbedControls,
  SpinnerWrapper,
} = util_components;

const {
  StackedHbarChart,
  A11YTable,
  GraphLegend,
} = declarative_charts;

const { text_maker, TM } = create_text_maker_component([text1,text2]);

const calculate_stats_common = (data) => {
  const total_funding = _.reduce(data,
    (total, budget_measure) => total + budget_measure.measure_data.funding, 
    0
  );

  const total_allocated = _.reduce(data,
    (total, budget_measure) => total + budget_measure.measure_data.allocated, 
    0
  );

  const measure_count = data.length;

  return {
    total_funding,
    total_allocated,
    measure_count,
    multiple_measures: measure_count > 1,
  }
}

const crso_program_calculate = (subject, info, options, years_with_data) => {
  const org_id_string = subject.dept.id.toString();
  
  const get_program_measures_with_data_filtered = (year) => _.chain( BudgetMeasure.get_all() )
    .filter(measure => _.indexOf( measure.orgs, org_id_string ) !== -1 && measure.year === year)
    .map( measure => 
      ({
        ...measure,
        measure_data: _.chain(measure.data)
          .filter( data => data.org_id === org_id_string )
          .thru( ([program_allocations]) => program_allocations )
          .value(),
      })
    )
    .filter(measure => measure.measure_data.allocated !== 0)
    .value();

  return {
    years_with_data,
    get_data: get_program_measures_with_data_filtered,
    get_info: calculate_stats_common,
    subject,
  };
}

const calculate_functions = {
  gov: function(subject, info, options, years_with_data){
    const get_all_measures_with_data_rolled_up = (year) => _.chain( BudgetMeasure.get_all() )
      .filter( measure => measure.year === year)
      .map( 
        measure => ({
          ...measure,
          measure_data: _.chain(budget_values)
            .keys()
            .map( key => [
              key,
              _.reduce(measure.data, (total, data_row) => total + data_row[key], 0),
            ])
            .fromPairs()
            .assign({
              measure_id: measure.id,
            })
            .value(),
        })
      )
      .value();

    return {
      years_with_data,
      get_data: get_all_measures_with_data_rolled_up,
      get_info: calculate_stats_common,
      subject,
    };
  },
  dept: function(subject, info, options, years_with_data){
    const org_id_string = subject.id.toString();

    const get_org_measures_with_data_filtered = (year) => _.chain( BudgetMeasure.get_all() )
      .filter(measure => _.indexOf( measure.orgs, org_id_string ) !== -1 && measure.year === year)
      .map( measure => ({
        ...measure,
        measure_data: _.filter( measure.data, data => data.org_id === org_id_string )[0],
      }))
      .value();
    
    return {
      years_with_data,
      get_data: get_org_measures_with_data_filtered,
      get_info: calculate_stats_common,
      subject,
    };
  },
  program: crso_program_calculate,
  crso: crso_program_calculate,
};

const budget_measure_render = function({calculations, footnotes, sources}){

  const { graph_args } = calculations;

  return (
    <Panel
      title={text_maker("budget_measures_panel_title")}
      {...{
        sources, 
        footnotes: _.compact([
          ...footnotes,
          (_.includes(["gov", 133, 55], graph_args.subject.id) && {text: text_maker("budget2019_biv_includes_excludes_note")}),
        ]),
      }}
    >
      <BudgetMeasurePanel graph_args = { graph_args } />
    </Panel>
  );
};


['gov', 'dept', 'program', 'crso'].forEach( level_name => new PanelGraph(
  {
    level: level_name,
    key: "budget_measures_panel",
    requires_has_budget_measures: true,
    footnotes: false,
    source: (subject) => [
      {
        html: text_maker("budget_route_title"),
        href: "#budget-tracker/budget-measure/overview",
      },
      {
        html: "Budget",
        href: "#metadata/BUDGET",
      },
    ],
    calculate: (subject, info, options) => {
      const years_with_data = level_name === "gov" ?
        budget_years :
        _.filter(
          budget_years,
          year => subject.has_data(`budget${year}_data`)
        );

      return !_.isEmpty(years_with_data) && calculate_functions[level_name](subject, info, options, years_with_data);
    },
    render: budget_measure_render,
  }
));


const treatAsProgram = (subject) => _.indexOf(["program", "crso"], subject.level) !== -1;
const get_grouping_options = (subject, data) =>{
  const common_options = [
    {
      name: text_maker('budget_measures'),
      id: 'measures',
    },
  ];

  if (subject.level === "gov"){
    return [
      ...common_options,
      {
        name: text_maker('orgs'),
        id: 'orgs',
      },
    ];
  } else if (subject.level === "dept"){
    const has_allocation_data = _.chain(data)
      .flatMap(budget_measure => budget_measure.measure_data)
      .filter(data => +data.org_id === subject.id)
      .some(data => data.allocated !== 0)
      .value();

    if (has_allocation_data){
      return [
        ...common_options,
        {
          name: text_maker('programs'),
          id: 'programs',
        },
      ];
    } else {
      return common_options;
    }
  } else {
    return common_options;
  }
}

class BudgetMeasurePanel extends React.Component {
  constructor(props){
    super(props);
    const { 
      graph_args: {
        years_with_data,
      },
    } = props;

    this.state = {
      years_with_data,
      selected_year: _.last(years_with_data),
      loading: true,
    }
  }
  mountAndUpdate(){
    const { 
      graph_args: {
        subject,
      },
    } = this.props;

    const {
      loading,
      selected_year,
    } = this.state;

    if (loading){
      ensure_loaded({
        subject,
        budget_measures: true,
        budget_years: [selected_year],
      })
        .then( () => this.setState({loading: false}) );
    }
  }
  componentDidMount(){ this.mountAndUpdate() }
  componentDidUpdate(){ this.mountAndUpdate() }
  render(){
    const { graph_args } = this.props;

    const {
      years_with_data,
      selected_year,
      loading,
    } = this.state;

    const inner_content = (
      <Fragment>
        { loading &&
          <div style={{position: "relative", height: "80px", marginBottom: "-10px"}}>
            <SpinnerWrapper config_name={"sub_route"} />
          </div>
        }
        { !loading &&
          <BudgetMeasureHBars graph_args={ graph_args } selected_year={ selected_year } />
        }
      </Fragment>
    );

    if ( years_with_data.length === 1) {
      return inner_content;
    }

    return (
      <div className="tabbed-content">
        <TabbedControls
          tab_callback={ (year) => this.setState({loading: true, selected_year: year}) }
          tab_options={
            _.map(
              years_with_data,
              (year) => ({
                key: year,
                label: `${text_maker("budget_name_header")} ${year}`,
                is_open: selected_year === year,
              })
            )
          }
        />
        <div className="tabbed-content__pane">
          {inner_content}
        </div>
      </div>
    );
  }
}

class BudgetMeasureHBars extends React.Component {
  constructor(props){
    super(props);

    const { 
      graph_args: {
        subject,
      },
    } = props;

    this.state = {
      grouping_options: {}, 
      selected_grouping: false,
      value_options: {},
      selected_value: treatAsProgram(subject) ? 
        "allocated" : 
        'funding_overview',
    };
  }
  static getDerivedStateFromProps(props, state){
    const { 
      graph_args: {
        get_data,
        get_info,
        subject,
      },
      selected_year,
    } = props;

    const {
      selected_grouping,
      selected_value,
    } = state; 

    const data = get_data(selected_year);
    const info = get_info(data); 
    
    const grouping_options = get_grouping_options(subject, data);

    const valid_selected_grouping = selected_grouping || grouping_options[0].id;

    const value_options = treatAsProgram(subject) || valid_selected_grouping === "programs" ? 
      [{
        id: "allocated",
        name: budget_values.allocated.text,
      }] :
      _.chain(data)
        .flatMap(data => data.measure_data)
        .reduce( 
          (memo, measure_data) => _.chain(budget_values)
            .keys()
            .map(key => [ key, memo[key] + measure_data[key] ])
            .fromPairs()
            .value(),
          _.chain(budget_values)
            .keys()
            .map(key => [key, 0])
            .fromPairs()
            .value()
        )
        .pickBy(value => value !== 0)
        .keys()
        .map(key => ({
          id: key,
          name: budget_values[key].text,
        }))
        .thru(value_options => [
          {
            id: "funding_overview",
            name: text_maker("funding_overview"),
          },
          ...value_options,
        ])
        .value();

    const valid_selected_value = valid_selected_grouping === "programs" ?
      selected_value : // don't update value state when switching to programs grouping, so that value isn't forced to allocated when users switch back to other groupings
      _.filter(value_options, value_option => value_option.id === selected_value).length === 1 ?
        selected_value :
        value_options[0].id;
    

    const sorted_data = _.chain(data)
      .map(measure => ({...measure, ...measure.measure_data}))
      .sortBy(valid_selected_value === "funding_overview" ? "funding" : valid_selected_value)
      .reverse()
      .value()
  
    const top = 25;

    const top_data = _.take(sorted_data,top);

    const others = {
      measure_id: 99999,
      chapter_key: null,
      description: "",
      name: "All other measures",
      section_id: null,
      year: "2019",
    };

    _.each(
      _.chain(sorted_data)
        .tail(top)
        .map(measure => ({...measure, ...measure.measure_data}))
        .value(),
      item => {
        _.each(['funding','remaining','allocated','withheld'], amount => {
          others[amount] = (others[amount] || 0) + item[amount];
        })
      }
    );

    const top_and_others = _.reverse( sorted_data.length > top ? _.concat(top_data,others) : sorted_data );


    const get_program_allocation_data_from_dept_data = (data) => {
      return _.chain(data)
        .flatMap( measure => _.chain(measure.data)
          .filter(measure_row => +measure_row.org_id === subject.id)
          .map("program_allocations")
          .value()
        )
        .reduce(
          (memo, program_allocations) => {
            _.each(
              program_allocations, 
              ({subject_id, allocated}) => {
                const memo_value = memo[subject_id] || 0;
                memo[subject_id] = memo_value + allocated;
              }
            )
            return memo;
          },
          {},
        )
        .map(
          (program_allocation, program_id) => {
            const program = Program.lookup(program_id) || CRSO.lookup(program_id);
    
            if ( !_.isUndefined(program) ){
              return {
                key: program_id,
                label: program.name,
                href: infograph_href_template(program, "financial"),
                data: {"allocated": program_allocation},
              };
            } else {
                window.is_dev && console.warn(`Budget panel: missing program ${program_id}`); // eslint-disable-line
    
              return {
                key: program_id,
                label: program_id,
                href: false,
                data: {"allocated": program_allocation},
              };
            }
          }
        )
        .value();
    };

    const get_org_budget_data_from_all_measure_data = (data) => {
      return _.chain(data)
        .flatMap( measure => measure.data)
        .groupBy("org_id")
        .map(
          (org_group, org_id) => {
            const dept = Dept.lookup(org_id);
            if ( _.isUndefined(dept) ){
              return false; // fake dept code case, "to be allocated" funds etc.
            } else {
              return {
                key: org_id,
                label: dept.name,
                href: infograph_href_template(dept, "financial"),
                data: _.reduce(
                  org_group,
                  (memo, measure_row) => _.mapValues(
                    memo,
                    (value, key) => value + measure_row[key]
                  ),
                  _.chain(budget_values)
                    .keys()
                    .map(value_key => [value_key, 0])
                    .fromPairs()
                    .value()
                ),  
              };
            }
          }
        )
        .filter()
        .value();
    };

    return {
      data: top_and_others,
      info,
      grouping_options,
      selected_grouping: valid_selected_grouping,
      selected_value: valid_selected_value,
      value_options,
    };
  }
  render(){
    const { 
      graph_args: {
        subject,
      },
      selected_year,
    } = this.props;

    const {
      selected_grouping,
      selected_value,
      grouping_options,
      value_options,
      data,
      info,
    } = this.state;


    // table stuff
    const has_budget_links = selected_year === "2018";

    // graph stuff
    const formatter = formats.compact1_raw;

    const effective_selected_value = selected_grouping === "programs" ?
      'allocated' :
      selected_value;

    const breakdown_keys = ['remaining','allocated','withheld']
    const keys_to_show = effective_selected_value === "funding_overview" ? breakdown_keys : [effective_selected_value]

    const biv_value_colors = id => {
      const scale = _.includes(breakdown_keys, id) ?
        d3.scaleOrdinal().domain(breakdown_keys).range(lightCategory10Colors) :
        d3.scaleOrdinal().range(lightCategory10Colors);
      return scale(id);
    };

    // text stuff
    const panel_text_args = {
      subject, 
      ...info, 
      budget_year: selected_year, 
      budget_data_source_date: budget_data_source_dates[selected_year],
      main_estimates_budget_link: main_estimates_budget_links[selected_year],
    };

    const text_area = <div className = "frow" >
      <div className = "fcol-md-12 fcol-xs-12 medium_panel_text text">
        { subject.level === "gov" &&
            <TM 
              k={"gov_budget_measures_panel_text"} 
              args={panel_text_args} 
            />
        }
        { subject.level === "dept" &&
            <TM
              k={"dept_budget_measures_panel_text"} 
              args={panel_text_args} 
            />
        }
        { treatAsProgram(subject) &&
            <TM
              k={"program_crso_budget_measures_panel_text"} 
              args={panel_text_args} 
            />
        }
      </div>
    </div>;


    if(window.is_a11y_mode){

      const program_allocation_data = subject.level === "dept" ?
          this.get_program_allocation_data_from_dept_data(data) :
          [];

      return <div>
        { text_area }
        <A11YTable
          table_name = { text_maker("budget_measure_a11y_table_title") }
          data = {_.map(data, 
            (budget_measure_item) => ({
              label: budget_measure_item.name,
              data: _.filter([
                !treatAsProgram(subject) && <Format
                  key = { budget_measure_item.id + "col2" } 
                  type = "compact1" 
                  content = { budget_measure_item.funding } 
                />,
                <Format
                  key = { budget_measure_item.id + (treatAsProgram(subject) ? "col2" : "col3") } 
                  type = "compact1"
                  content = { budget_measure_item.allocated } 
                />,
                !treatAsProgram(subject) && <Format
                  key = { budget_measure_item.id + "col4" } 
                  type = "compact1"
                  content = { budget_measure_item.withheld } 
                />,
                !treatAsProgram(subject) && <Format
                  key = { budget_measure_item.id + "col5" } 
                  type = "compact1"
                  content = { budget_measure_item.remaining } 
                />,
                has_budget_links && <a 
                  key = { budget_measure_item.id + (treatAsProgram(subject) ? "col3" : "col6") }
                  href = { BudgetMeasure.make_budget_link(budget_measure_item.chapter_key, budget_measure_item.ref_id) }
                >
                  { text_maker("link") }
                </a>,
              ]),
            })
          )}
          label_col_header = { text_maker("budget_measure") }
          data_col_headers = {_.filter([
            !treatAsProgram(subject) && budget_values.funding.text,
            budget_values.allocated.text,
            !treatAsProgram(subject) && budget_values.withheld.text,
            !treatAsProgram(subject) && budget_values.remaining.text,
            has_budget_links && text_maker("budget_panel_a11y_link_header"),
          ])}
        />
        { subject.level === "gov" &&
            <A11YTable
              table_name = { text_maker("budget_org_a11y_table_title") }
              data = {_.map( this.get_org_budget_data_from_all_measure_data(data),
                (org_item) => ({
                  label: org_item.label,
                  data: _.filter([
                    <Format
                      key = { org_item.key + "col3" } 
                      type = "compact1" 
                      content = { org_item.data.funding } 
                    />,
                    <Format
                      key = { org_item.key + "col4" } 
                      type = "compact1"
                      content = { org_item.data.allocated } 
                    />,
                    <Format
                      key = { org_item.key + "col5" } 
                      type = "compact1"
                      content = { org_item.data.withheld } 
                    />,
                    <Format
                      key = { org_item.key + "col6" } 
                      type = "compact1"
                      content = { org_item.data.remaining } 
                    />,
                  ]),
                })
              )}
              label_col_header = { text_maker("org") }
              data_col_headers = {_.filter([
                budget_values.funding.text,
                budget_values.allocated.text,
                budget_values.withheld.text,
                budget_values.remaining.text,
              ])}
            />
        }
        { subject.level === "dept" && !_.isEmpty(program_allocation_data) &&
            <A11YTable
              table_name = { text_maker("budget_program_a11y_table_title") }
              data = {_.map( program_allocation_data, 
                (program_item) => ({
                  label: program_item.label,
                  data: _.filter([
                    <Format
                      key = { program_item.key + "col3" } 
                      type = "compact1" 
                      content = { program_item.data.allocated } 
                    />,
                  ]),
                })
              )}
              label_col_header = { text_maker("program") }
              data_col_headers = {_.filter([
                budget_values.allocated.text,
              ])}
            />
        }
      </div>;
    } else {
      return (
        <Fragment>
          {text_area}
          <div className = 'centerer'>
            <label style={{padding: "15px"}}>
              <TM k="budget_panel_group_by" />
              <Select 
                selected = {selected_grouping}
                options = {_.map(grouping_options, 
                  ({name, id}) => ({
                    id,
                    display: name,
                  })
                )}
                onSelect = { id => this.setState({selected_grouping: id}) }
                className = "form-control"
              />
            </label>
            <label style={{padding: "15px"}}>
              <TM k="budget_panel_select_value" />
              <Select 
                selected = {effective_selected_value}
                options = {_.map(value_options, 
                  ({name, id}) => ({ 
                    id,
                    display: name,
                  })
                )}
                onSelect = { id => this.setState({selected_value: id}) }
                className = "form-control"
              />
            </label>
          </div>
          <div className="centerer" style={{height: `${data.length*30 + 150}px`}}>
            <NivoResponsiveHBar
              data={data}
              indexBy = "name"
              keys = {keys_to_show}
              enableLabel = {true}
              label={d => {return formatter(d.value)} }
              colorBy = {d => biv_value_colors(d.id)}
              margin = {{
                top: 20,
                right: 20,
                bottom: 100,
                left: 300,
              }}
              bttm_axis={{
                tickSize: 5,
                tickPadding: 5,
                tickValues: 6,
                format: (d) => formatter(d),
              }}
              left_axis={{
                tickSize: 5,
                tickPadding: 5,
                format: (d) => wrap(d, 50),
              }}
              padding = {0.1}
              is_money = {true}
              enableGridX={false}
              enableGridY={false}
              isInteractive={true}
              labelSkipWidth={50}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "top",
                  direction: "row",
                  justify: false,
                  translateX: 0,
                  translateY: -10,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 0,
                  itemDirection: "left-to-right",
                  symbolSize: 20,
                },
              ]}
            />
          </div>
        </Fragment>
      )
    }
  }
}

function wrap(text, width) {
  const words = text.split(/\s+/).reverse();
  let word;
  let line = [];
  let lineHeight = 1; // em
  const x = 0;
  const y = 0;
  const dy = 0;
  const lines = [];
  word = words.pop();
  while (word) {
    line.push(word);
    const line_str = line.join(" ");
    if ( line_str.length > width ){
      line.pop();
      lines.push(line.join(" "))
      line = [word];
    }
    word = words.pop();
  }
  lines.push(line.join(" "));
  const tspans = _.map(lines, (line,ix) => <tspan key={ix} x={x} y={y} dy={ix > 0 ? lineHeight + dy + "em" : "0em"}>{line}</tspan> );
  return <Fragment>{ tspans }</Fragment>;
}





// else if (selected_grouping === 'orgs'){
//   data_by_selected_group = get_org_budget_data_from_all_measure_data(data);
// } else if (selected_grouping === 'programs'){
//   data_by_selected_group = get_program_allocation_data_from_dept_data(data);
// }