import './diff.scss';
import { StandardRouteContainer } from '../core/NavComponents.js';
import { create_text_maker } from '../models/text.js';
import { 
  create_text_maker_component,
} from '../util_components.js';
import diff_text from './diff.yaml';
import result_text from '../panels/result_graphs/result_components.yaml';
import { get_static_url } from '../request_utils.js';
import { ensure_loaded } from '../core/lazy_loader.js';
import { single_subj_results_scheme, get_initial_single_subj_results_state } from '../gen_expl/results_scheme.js';
import { 
  Result,
  Indicator,
  ResultCounts,
  GranularResultCounts,
  result_docs,
} from '../panels/result_graphs/results_common.js'
import { Subject } from '../models/subject.js';
import { Select } from '../components/Select.js';
import { SpinnerWrapper } from '../components/SpinnerWrapper.js';
import * as Diff from 'diff';
import { Fragment } from 'react';
import { formats } from '../core/format.js';

const { Dept, CRSO, Program } = Subject;


const { TM } = create_text_maker_component([diff_text, result_text]);
const text_maker = create_text_maker([diff_text, result_text]);


const get_subject_from_props = (props) => {
  const {
    match: {
      params: { org_id, crso_id },
    },
  } = props;
  if(crso_id && CRSO.lookup(crso_id)){
    return CRSO.lookup(crso_id)
  }
  if (org_id && Dept.lookup(org_id)) {
    return Dept.lookup(org_id)
  }
  return props.subject; // default
}

const get_target_from_indicator = (indicator) => {
  const {
    target_type,
    target_min,
    target_max,
    target_narrative,
  } = indicator;

  const display_type_by_data_type = {
    num: "result_num",
    num_range: "result_num",
    dollar: "dollar",
    dollar_range: "dollar",
    percent: "result_percentage",
    percent_range: "result_percentage",
  };
  switch(target_type){
    case 'num':
    case 'num_range':
    case 'dollar':
    case 'dollar_range':
    case 'percent':
    case 'percent_range': {
      if ( /range/.test(target_type) && (target_min && target_max) ){
        return `${text_maker("result_range_text")} ${formats[display_type_by_data_type[target_type]](target_min, {raw: true})} ${text_maker("and")} ${formats[display_type_by_data_type[target_type]](target_max, {raw: true})}`
      } else if (target_min && target_max && target_min === target_max){
        return formats[display_type_by_data_type[target_type]](target_min, {raw: true})
      } else if (target_min && !target_max){
        return `${text_maker("result_lower_target_text")} ${formats[display_type_by_data_type[target_type]](target_min, {raw: true})}` 
      } else if (!target_min && target_max){
        return `${text_maker("result_upper_target_text")} ${formats[display_type_by_data_type[target_type]](target_max, {raw: true})}` 
      } else {
        return text_maker('unspecified_target')
      }
    }
    case 'text': {
      if ( _.isEmpty(target_narrative) ){
        return text_maker('unspecified_target')
      } else {
        return target_narrative
      }
    }
    case 'tbd': {
      return text_maker('tbd_result_text');
    }
    default: {
      return text_maker('unspecified_target')
    }
  }
}

const format_target_string = (indicator) => {
  const target = get_target_from_indicator(indicator)
  return target + (indicator.measure ? `(${indicator.measure})` : '');
}

const process_indicators = (subject) => {
  const matched_indicators = _.chain(Result.get_all())
    .filter(res => {
      const res_subject = Program.lookup(res.subject_id) || CRSO.lookup(res.subject_id);
      return subject.level === 'dept' ? res_subject.dept === subject : res_subject === subject;
    })
    .map(res => res.indicators)
    .flatten()
    .groupBy("stable_id")
    .map(pair => _.sortBy(pair, "doc"))
    .value();

  const processed_indicators = _.map(matched_indicators, (indicator_pair, ix) => {
    if (indicator_pair.length===2){
      return {
        status: 'both',
        indicator_pair,
        name_diff: Diff.diffWords(indicator_pair[0].name, indicator_pair[1].name),
        methodology_diff: Diff.diffWords(indicator_pair[0].methodology, indicator_pair[1].methodology),
        target_diff: Diff.diffWords(format_target_string(indicator_pair[0]), format_target_string(indicator_pair[1])),
      }
    }
    const indicator = indicator_pair[0];
    return {
      status: indicator.doc,
      indicator,
      name: indicator.name,
      methodology: indicator.methodology,
      target: format_target_string(indicator),
    }
  });
  return processed_indicators;
}

export default class TextDiffApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      subject: get_subject_from_props(props),
    };
  }

  componentDidMount(){
    const { 
      subject,
    } = this.state;
  
    ensure_loaded({
      subject,
      results: true,
      result_docs: ['dp19','dp18'],
    })
      .then( () => {
        const processed_indicators = process_indicators(subject);
        this.setState({subject: subject, loading: false, processed_indicators: processed_indicators});
      });
  }

  static getDerivedStateFromProps(props, state){
    const {
      match: {
        params: {
          org_id,
          crso_id,
        },
      },
    } = props;

    const {
      subject,
    } = state;

    const should_load = get_subject_from_props(props) !== subject;
    const new_subject = should_load ? get_subject_from_props(props) : subject;
    return {loading: should_load, subject: new_subject};
  }

  componentDidUpdate(){
    const {
      loading,
      subject,
    } = this.state;


    if(loading){
      ensure_loaded({
        subject,
        results: true,
        result_docs: ['dp19','dp18'],
      })
        .then( () => {
          const processed_indicators = process_indicators(subject);
          this.setState({subject: subject, loading: false, processed_indicators: processed_indicators});
        });
    }
  }

  render() {
    const { 
      loading,
      subject,
      processed_indicators,
    } = this.state;

    const { 
      history,
    } = this.props;

    const all_depts = _.chain(Dept.get_all()).filter(dept => !!dept.dp_status).sortBy('fancy_name').value();
    const all_crs_for_subj = _.filter(subject.level === 'dept' ? subject.crsos : subject.dept.crsos, cr => cr.is_cr);

    const current_dept = subject.level === 'dept' ? subject : subject.dept;

    return (
      loading ? <SpinnerWrapper ref="spinner" config_name={"sub_route"} /> :
        <StandardRouteContainer
          title={text_maker("diff_title")}
          breadcrumbs={[text_maker("diff_title")]}
          //description={} TODO
          route_key="_diff"
        >
          <TM k="diff_title" el="h1" />
          <div className="textDiff--instructions">
            <TM k="diff_intro_text"/>
          </div>
          <div>
            <label htmlFor='select_dept'>
              <TM k="select_dept" />
            </label>
            <Select
              name='select_dept'
              selected={current_dept.id}
              onSelect={id => {
                const new_url = `/diff/${id}/all`;
                history.push(new_url);
              }}
              options={ _.map(all_depts, dept => ({id: dept.id, display: dept.fancy_name}) )}
            />
          </div>
          <div>
            <label htmlFor='select_cr'>
              <TM k="select_cr" />
            </label>
            <Select
              name='select_cr'
              selected={subject.level === 'crso' ? subject.id : 'all'}
              onSelect={id => {
                const new_url = `/diff/${subject.level === 'dept' ? subject.id : subject.dept.id}/${id}`;
                history.push(new_url);
              }}
              options={_.chain(all_crs_for_subj).map(cr => ({id: cr.id, display: cr.name})).concat([{id: 'all', display: text_maker('all_crs')}]).value() }
            />
          </div>
          <div>
            {_.map(processed_indicators, processed_indicator => indicator_report(processed_indicator) )}
          </div>
        </StandardRouteContainer>
    );
  }
}

TextDiffApp.defaultProps = {
  subject: Dept.lookup(326),
}

const indicator_report = (processed_indicator) => {
  if(processed_indicator.status === 'both'){
    return (
      <div key={processed_indicator.indicator_pair[0].stable_id} className="textDiff--indicator-report" >
        <TM k="indicator_name" el="h4" />
        { processed_indicator.name_diff.length > 1 ?
          difference_report(processed_indicator.name_diff) :
          no_difference(processed_indicator.indicator_pair[0].name) }
        <TM k="indicator_methodology" el="h4" />
        { processed_indicator.methodology_diff.length > 1 ?
          difference_report(processed_indicator.methodology_diff) :
          no_difference(processed_indicator.indicator_pair[0].methodology) }
        <TM k="indicator_target" el="h4" />
        { processed_indicator.target_diff.length > 1 ?
          difference_report(processed_indicator.target_diff) :
          no_difference(get_target_from_indicator(processed_indicator.indicator_pair[0])) }
        <div className="textDiff--id-tag">{`ID: ${processed_indicator.indicator_pair[0].stable_id}`}</div>
      </div>
    )
  } else {
    const add_remove_status = processed_indicator.status === "dp18" ? "indicator-removed" : "indicator-added";
    return (
      <div key={processed_indicator.indicator.stable_id} className="textDiff--indicator-report" >
        <TM k="indicator_name" el="h4" />
        <div>
          <div className={`textDiff--${add_remove_status}`}>{text_maker(add_remove_status)}</div>
          <div>{processed_indicator.name}</div>
        </div>
        <TM k="indicator_methodology" el="h4" />
        <div>
          <div className={`textDiff--${add_remove_status}`}>{text_maker(add_remove_status)}</div>
          <div>{processed_indicator.methodology}</div>
        </div>
        <TM k="indicator_target" el="h4" />
        <div>
          <div className={`textDiff--${add_remove_status}`}>{text_maker(add_remove_status)}</div>
          <div>{processed_indicator.target}</div>
        </div>
        <div className="textDiff--id-tag">{`ID: ${processed_indicator.indicator.stable_id}`}</div>
      </div>
    )
  }
}

const no_difference = (text) =>
  <div>
    <div className="textDiff--nochange">{text_maker("no_diff")}</div>
    <div>{text}</div>
  </div>

const difference_report = (diff) =>
  <div className="row">
    <div className="col-md-6" >
      {_.map(diff, (part,iix) =>
        <span
          key={iix}
          className={part.removed ? 'removed' : ''}
          style={{display: part.added ? "none" : "inline"}}
        >
          {part.value}
        </span>
      )}
    </div>
    <div className="col-md-6" >
      {_.map(diff, (part,iix) =>
        <span
          key={iix}
          className={ part.added ? 'added' : ''}
          style={{display: part.removed ? "none" : "inline"}}
        >
          {part.value}
        </span>
      )}
    </div>
  </div>
