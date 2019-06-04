import './TextDiff.scss';
import { StandardRouteContainer } from '../core/NavComponents.js';
import { create_text_maker } from '../models/text.js';
import { 
  create_text_maker_component,
} from '../util_components.js';
import diff_text from './TextDiff.yaml';
import result_text from '../panels/result_graphs/result_components.yaml';
import { ensure_loaded } from '../core/lazy_loader.js';
import { Result } from '../panels/result_graphs/results_common.js';
import { Subject } from '../models/subject.js';
import { Select } from '../components/Select.js';
import { SpinnerWrapper } from '../components/SpinnerWrapper.js';
import * as Diff from 'diff';
import { Fragment } from 'react';
import { formats } from '../core/format.js';
import { result_docs } from '../models/results.js';
import classNames from 'classnames';

const { Dept, CRSO, Program } = Subject;


const { TM } = create_text_maker_component([diff_text, result_text]);
const text_maker = create_text_maker([diff_text, result_text]);



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
        return `${text_maker("result_range_text")} ${formats[display_type_by_data_type[target_type]](target_min, {raw: true})} ${text_maker("and")} ${formats[display_type_by_data_type[target_type]](target_max, {raw: true})}`;
      } else if (target_min && target_max && target_min === target_max){
        return formats[display_type_by_data_type[target_type]](target_min, {raw: true});
      } else if (target_min && !target_max){
        return `${text_maker("result_lower_target_text")} ${formats[display_type_by_data_type[target_type]](target_min, {raw: true})}`; 
      } else if (!target_min && target_max){
        return `${text_maker("result_upper_target_text")} ${formats[display_type_by_data_type[target_type]](target_max, {raw: true})}`; 
      } else {
        return text_maker('unspecified_target');
      }
    }
    case 'text': {
      if ( _.isEmpty(target_narrative) ){
        return text_maker('unspecified_target');
      } else {
        return target_narrative;
      }
    }
    case 'tbd': {
      return text_maker('tbd_result_text');
    }
    default: {
      return text_maker('unspecified_target');
    }
  }
};

const format_target_string = (indicator) => {
  const target = get_target_from_indicator(indicator);
  return target + (indicator.measure ? `(${indicator.measure})` : '');
};

const get_indicators = (subject) => {
  return _.chain(Result.get_all())
    .filter(res => {
      const res_subject = Program.lookup(res.subject_id) || CRSO.lookup(res.subject_id);
      return subject.level === 'dept' ? res_subject.dept === subject : res_subject === subject || res_subject.crso === subject;
    })
    .map(res => res.indicators)
    .flatten()
    .groupBy("stable_id")
    .map(pair => _.sortBy(pair, "doc"))
    .value();
};

const process_indicators = (matched_indicators) => {
  const processed_indicators = _.map(matched_indicators, (indicator_pair) => {
    if (indicator_pair.length===2){
      return {
        status: 'both',
        indicator1: indicator_pair[0],
        indicator2: indicator_pair[1],
        name_diff: Diff.diffWords(indicator_pair[0].name, indicator_pair[1].name),
        methodology_diff: window.is_a11y_mode ? Diff.diffSentences(indicator_pair[0].methodology, indicator_pair[1].methodology) : Diff.diffWords(indicator_pair[0].methodology, indicator_pair[1].methodology),
        target_diff: Diff.diffWords(format_target_string(indicator_pair[0]), format_target_string(indicator_pair[1])),
      };
    }
    const indicator = indicator_pair[0];
    return {
      status: indicator.doc,
      indicator1: indicator,
      indicator2: indicator,
      name_diff: [indicator.name],
      methodology_diff: [indicator.methodology],
      target_diff: [format_target_string(indicator)],
    };
  });
  return processed_indicators;
};

const get_new_url = (subject) => {
  if(subject.level === 'dept'){
    return `/diff/${subject.id}`;
  } else if(subject.level === 'crso'){
    return `/diff/${subject.dept.id}/${subject.id}`;
  } else {
    return `/diff/${subject.dept.id}/${subject.crso.id}/${subject.id}`;
  }
};


export default class TextDiffApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      first_load: true,
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
      result_docs: _.chain(result_docs).keys().filter( doc => /^dp[0-9]+/ ).takeRight(2).value(),
    })
      .then( () => {
        const matched_indicators = get_indicators(subject);
        const processed_indicators = process_indicators(matched_indicators);
        
        this.setState({first_load: false, subject: subject, loading: false, matched_indicators: matched_indicators, processed_indicators: processed_indicators});
      });
  }


  static getDerivedStateFromProps(props, state){
    const {
      first_load,
      subject,
    } = state;

    const should_load = first_load || get_subject_from_props(props) !== subject;
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
        result_docs: _.chain(result_docs).keys().filter( doc => /^dp[0-9]+/ ).takeRight(2).value(),
      })
        .then( () => {
          const matched_indicators = get_indicators(subject);
          const processed_indicators = process_indicators(matched_indicators);
          
          this.setState({first_load: false, subject: subject, loading: false, matched_indicators: matched_indicators, processed_indicators: processed_indicators});
        });    
    }
  }

  render() {
    const { 
      loading,
      subject,
      processed_indicators,
      matched_indicators,
    } = this.state;

    const { 
      history,
    } = this.props;

    const all_depts = _.chain(Dept.get_all()).filter(dept => !!dept.dp_status).sortBy('fancy_name').value();
    const crs_without_internal = _.filter(subject.level === 'dept' ? subject.crsos : subject.dept.crsos, cr => cr.is_cr && !(cr.is_internal_service));

    const current_dept = subject.level === 'dept' ? subject : subject.dept;

    // TODO: allow this to change
    const years = _.chain(result_docs)
      .keys()
      .filter( doc => /^dp[0-9]+/ )
      .takeRight(2)
      .value();

    return (
      <StandardRouteContainer
        title={text_maker("diff_title")}
        breadcrumbs={[text_maker("diff_title")]}
        //description={} TODO
        route_key="_diff"
        beta={true}
      >
        <TM k="diff_title" el="h1" />
        <div className={classNames("medium_panel_text","text-diff__instructions")}>
          <TM k="diff_intro_text"/>
        </div>
        <div className={classNames("medium_panel_text")}>
          <label htmlFor='select_dept'>
            <TM k="select_dept" />
          </label>
          <Select
            className='text-diff__selector'
            name='select_dept'
            selected={current_dept.id}
            onSelect={id => {
              const new_url = get_new_url(Dept.lookup(id));
              history.push(new_url);
            }}
            options={ _.map(all_depts, dept => ({id: dept.id, display: dept.fancy_name}) )}
          />
        </div>
        <div className={classNames("medium_panel_text")}>
          <label htmlFor='select_cr'>
            <TM k="select_cr" />
          </label>
          <Select
            className='text-diff__selector'
            name='select_cr'
            selected={subject.level === 'program' ?
              subject.crso.id :
              subject.level === 'crso' ? subject.id : 'all'}
            onSelect={id => {
              const new_url = get_new_url(CRSO.lookup(id));
              history.push(new_url);
            }}
            options={_.chain(crs_without_internal).map(cr => ({id: cr.id, display: cr.name})).concat([{id: 'all', display: text_maker('all_crs')}]).value() }
          />
        </div>
        <div className={classNames("medium_panel_text")}>
          <label htmlFor='select_program'>
            <TM k="select_program" />
          </label>
          <Select
            className='text-diff__selector'
            name='select_program'
            selected={subject.level === 'program' ? subject.id : 'all'}
            onSelect={id => {
              const new_url = get_new_url(Program.lookup(id));
              history.push(new_url);
            }}
            options={_.chain(
              subject.level === 'dept' ?
                crs_without_internal :
                subject.level === 'crso' ? [subject] : [subject.crso])
              .map('programs')
              .flatten()
              .compact()
              .map(prog => ({id: prog.id, display: prog.name}))
              .concat([{id: 'all', display: text_maker('all_programs')}])
              .value()
            }
          />
        </div>
        {loading ? <SpinnerWrapper ref="spinner" config_name={"sub_route"} /> :
          <div>
            <h3>{text_maker("list_of_indicators")}</h3>
            <div>{subject_intro(subject, matched_indicators.length, years)}</div>
            {_.map(processed_indicators, processed_indicator => indicator_report(processed_indicator, years) )}
          </div>}
      </StandardRouteContainer>
    );
  }
}

const get_subject_from_props = (props) => {
  const {
    match: {
      params: { org_id, crso_id, program_id },
    },
  } = props;
  if(program_id && Program.lookup(program_id)){
    return Program.lookup(program_id);
  }
  if(crso_id && CRSO.lookup(crso_id)){
    return CRSO.lookup(crso_id);
  }
  if (org_id && Dept.lookup(org_id)) {
    return Dept.lookup(org_id);
  }
  return props.subject; // default
};

TextDiffApp.defaultProps = {
  subject: Dept.lookup(326),
};

const subject_intro = (subject, num_indicators, years) =>
  <div className="medium_panel_text">
    <TM 
      k={"indicator_counts_text"}
      args={{
        subject: subject,
        name: subject.name,
        doc_year_1: result_docs[years[0]].year,
        doc_year_2: result_docs[years[1]].year,
        num_indicators: num_indicators,
      }}
    />
  </div>;


const get_status_flag = (indicator_status, num_texts, target_changed, years) => {
  if(num_texts > 1){
    return target_changed ?
      <Fragment>
        <div className="text-diff__indicator-status--change">
          {text_maker("words_changed")}
        </div>
        <div className="text-diff__indicator-status--change">
          {text_maker("target_changed")}
        </div>
      </Fragment> :
      <div className="text-diff__indicator-status--change">
        {text_maker("words_changed")}
      </div>;
  }
  if (indicator_status === 'both'){
    return (
      <div className="text-diff__indicator-status--nochange">
        {text_maker("no_diff")}
      </div>
    );
  }
  if(indicator_status === 'dp18'){
    return (
      <div className="text-diff__indicator-status--removed">
        {text_maker("indicator-removed", {second_year: result_docs[years[1]].year})}
      </div>
    );
  }
  if(indicator_status === 'dp19'){
    return (
      <div className="text-diff__indicator-status--added">
        {text_maker("indicator-added", {second_year: result_docs[years[1]].year})}
      </div>
    );
  }
  return "";
};

const indicator_report = (processed_indicator, years) => 
  <div key={processed_indicator.indicator1.stable_id} className="text-diff__indicator-report" >
    <div className="text-diff__indicator-report__header">
      <h4>{processed_indicator.indicator2.name}</h4>
    </div>
    <div className="text-diff__indicator-report__body">
      {get_status_flag(processed_indicator.status,
        _.max([processed_indicator.name_diff.length, processed_indicator.methodology_diff.length, processed_indicator.target_diff.length]),
        processed_indicator.target_diff.length > 1,
        years)}
      { processed_indicator.name_diff.length > 1 ?
        difference_report(processed_indicator.name_diff, "indicator_name", years) :
        no_difference(processed_indicator.indicator1.name, "indicator_name") }
      { processed_indicator.methodology_diff.length > 1 ?
        difference_report(processed_indicator.methodology_diff, "indicator_methodology", years) :
        no_difference(processed_indicator.indicator1.methodology, "indicator_methodology") }
      { processed_indicator.target_diff.length > 1 ?
        difference_report(processed_indicator.target_diff, "indicator_target", years) :
        no_difference(get_target_from_indicator(processed_indicator.indicator1), "indicator_target") }
      <div className="text-diff__id-tag">{`ID: ${processed_indicator.indicator1.stable_id}`}</div>
    </div>
  </div>;


const no_difference = (text, key) =>
  <Fragment>
    <div className="text-diff__indicator-report__subheader" >
      <h5>{`${text_maker(key)} (${text_maker("no_diff")})`}</h5>
    </div>
    <div className="text-diff__indicator-report__row">
      <div>{text}</div>
    </div>
  </Fragment>;

const difference_report = (diff, key, years) => 
  <Fragment>
    <div className="text-diff__indicator-report__subheader" >
      <h5>{text_maker(key)}</h5>
    </div>
    <div className={classNames("row","text-diff__indicator-report__row")}>
      <div className="col-md-6" >
        <h6>{result_docs[years[0]].year}</h6>
      </div>
      <div className="col-md-6" >
        <h6>{result_docs[years[1]].year}</h6>
      </div>
    </div>
    <div className={classNames("row","text-diff__indicator-report__row")}>
      <div className="col-md-6" >
        {_.map(diff, (part,iix) =>
          <Fragment key={iix}>
            {window.is_a11y_mode && part.removed && <span className='text-diff__text-part--removed'> [{text_maker("a11y_begin_removed")}]</span>}
            <span
              className={part.removed ? 'text-diff__text-part--removed' : ''}
              style={{display: part.added ? "none" : "inline"}}
            >
              {part.value}
            </span>
            {window.is_a11y_mode && part.removed && <span className='text-diff__text-part--removed'> [{text_maker("a11y_end_removed")}]</span>}
          </Fragment>
        )}
      </div>
      <div className="col-md-6" >
        {_.map(diff, (part,iix) =>
          <Fragment key={iix}>
            {window.is_a11y_mode && part.added && <span className='text-diff__text-part--added'> [{text_maker("a11y_begin_added")}]</span>}
            <span
              className={ part.added ? 'text-diff__text-part--added' : ''}
              style={{display: part.removed ? "none" : "inline"}}
            >
              {part.value}
            </span>
            {window.is_a11y_mode && part.added && <span className='text-diff__text-part--added'> [{text_maker("a11y_end_added")}]</span>}
          </Fragment>
        )}
      </div>
    </div>
  </Fragment>;