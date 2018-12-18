import './EstimatesComparison.scss';
import classNames from 'classnames';
import { text_maker, TM } from './text-provider';
import { combineReducers, createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { StandardRouteContainer } from '../core/NavComponents';
import { infograph_href_template } from '../link_utils.js';
import { sources } from '../metadata/data_sources.js';
import {
  SpinnerWrapper,
  FootnoteList,
  HeightClipper,
  Format,
  RadioButtons,
  LabeledBox,
} from '../util_components.js';
import { 
  get_root,
} from '../gen_expl/hierarchy_tools.js';
import {
  get_memoized_funcs,
  initial_root_state,
  root_reducer,
  map_state_to_root_props_from_memoized_funcs,
  map_dispatch_to_root_props,
} from '../gen_expl/state_and_memoizing';
import { ensure_loaded } from '../core/lazy_loader.js';
import { Explorer } from '../components/ExplorerComponents.js';
import {
  estimates_diff_scheme,
  col_defs,
  initial_state as initial_scheme_state,
} from './scheme.js';
import { businessConstants } from '../models/businessConstants.js';

const { estimates_docs } = businessConstants;

export default class EstimatesComparison extends React.Component {
  constructor(){
    super();
    this.state = {loading: true};
  }
  componentDidMount(){
    ensure_loaded({
      table_keys: ["table8"],
      footnotes_for: "estimates",
    }).then(()=> {
      this.setState({ loading: false });
    });
  }
  render(){
    const title = text_maker("diff_view_title");
    return (
      <StandardRouteContainer
        title={title}
        breadcrumbs={[title]}
        description={text_maker("estimates_comparison_desc_meta_attr")}
        route_key="_dev"
      >
        <h1><TM k="diff_view_title"/></h1>
        { this.state.loading ? 
          <SpinnerWrapper config_name={"sub_route"} /> :
          <ExplorerContainer />
        }
      </StandardRouteContainer>
    );
  }
}

const map_state_to_props_from_memoized_funcs = memoized_funcs => {

  const { get_scheme_props } = memoized_funcs;
  const mapRootStateToRootProps = map_state_to_root_props_from_memoized_funcs(memoized_funcs);

  return state => _.immutate(
    mapRootStateToRootProps(state),
    get_scheme_props(state)
  );
}

class ExplorerContainer extends React.Component {
  constructor(){
    super();

    const scheme = estimates_diff_scheme;
    const scheme_key = estimates_diff_scheme.key;

    const reducer = combineReducers({
      root: root_reducer, 
      [scheme_key]: scheme.reducer,
    });

    const mapStateToProps = map_state_to_props_from_memoized_funcs(get_memoized_funcs([scheme]));

    const mapDispatchToProps = dispatch => _.immutate(
      map_dispatch_to_root_props(dispatch),
      scheme.dispatch_to_props(dispatch)
    );

    const initialState = {
      root: _.immutate(initial_root_state, {scheme_key}),
      [scheme_key]: initial_scheme_state,
    };

    const connecter = connect(mapStateToProps, mapDispatchToProps);
    const Container = connecter(EstimatesExplorer);
    const store = createStore(reducer,initialState);

    this.Container = Container;
    this.store = store;
  }
  render(){
    const { store, Container } = this;
    return (
      <Provider store={store}>
        <Container />
      </Provider>
    );
  }

}

const DetailedAmountsByDoc = ({amounts_by_doc}) => {

  const sorted_items = _.sortBy(amounts_by_doc, ({doc_code}) => estimates_docs[doc_code].order );

  return (
    <section className="LastYearEstimatesSection"><div>
      <header className="agnostic-header">
        <TM k="doc_breakout_details" />
      </header>
      <table className="table table-condensed">
        <thead>
          <tr>
            <th scope="column">
              <TM k="estimates_doc" />
            </th>
            <th scope="column">
              <TM k="last_year_authorities" />
            </th>
            <th scope="column">
              <TM k="this_year_authorities" />
            </th>
          </tr>
        </thead>
        <tbody>
          {_.map(sorted_items, ({ doc_code, amount_last_year, amount_this_year }) => 
            <tr key={doc_code}>
              <td> {estimates_docs[doc_code][lang]} </td>
              <td> 
                {
                  amount_last_year && 
                  <Format type="compact1" content={amount_last_year} />
                } 
              </td>
              <td> 
                {
                  amount_this_year && 
                  <Format type="compact1" content={amount_this_year} />
                } 
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div></section>
  );

};

const get_non_col_content = ({node}) => {
  const subject = _.get(node, "data.subject");
  const footnotes = _.get(node, "data.footnotes");
  const amounts_by_doc = _.get(node,"data.amounts_by_doc");

  return (
    <div>
      { !_.isEmpty(amounts_by_doc) &&
        <div>
          <DetailedAmountsByDoc amounts_by_doc={amounts_by_doc} />
        </div>
      }
      {!_.isEmpty(footnotes) && 
        <div className={classNames(subject && "mrgn-bttm-lg")}>
          <HeightClipper
            allowReclip={true} 
            clipHeight={150}
          >
            <header className="agnostic-header"><TM k="notes" /></header>
            <FootnoteList
              footnotes={footnotes}
            />
          </HeightClipper>
        </div>
      }
      { subject && 
        <div className='ExplorerNode__BRLinkContainer'>
          <a href={infograph_href_template(subject)}> 
            <TM k="see_an_infograph_for" args={{subject}} />
          </a>
        </div>
      }
    </div>
  );
}

class EstimatesExplorer extends React.Component {
  constructor(){
    super()
    this.state = { _query: "" };
    this.debounced_set_query = _.debounce(this.debounced_set_query, 500);
  }
  handleQueryChange(new_query){
    this.setState({
      _query: new_query,
      loading: new_query.length > 3 ? true : undefined,
    });
    this.debounced_set_query(new_query);
  } 
  debounced_set_query(new_query){
    this.props.set_query(new_query);
    this.timedOutStateChange = setTimeout(()=>{
      this.setState({
        loading: false,
      });
    }, 500)
  }
  componentWillUnmount(){
    !_.isUndefined(this.debounced_set_query) && this.debounced_set_query.cancel();
    !_.isUndefined(this.timedOutStateChange) && clearTimeout(this.timedOutStateChange);
  }
  clearQuery(){
    this.setState({_query: ""});
    this.props.clear_query("");
  }
  render(){
    const {
      flat_nodes,
      is_filtering,

      set_query,
      toggle_node,
      
      is_descending,
      sort_col,
      col_click,

      //scheme props
      show_stat,
      toggle_stat_filter,
      h7y_layout,
      set_h7y_layout,
    } = this.props;
    const { loading } = this.state;

    const root = get_root(flat_nodes);

    const explorer_config = {
      column_defs: col_defs,
      onClickExpand: id => toggle_node(id),
      is_sortable: true,
      zebra_stripe: true,
      col_click,
      //un-used features...
      get_non_col_content,
      children_grouper: null,
    }

    return (
      <div>
        <div className="medium_panel_text mrgn-tp-lg">
          <TM k="diff_view_top_text" />
        </div>
        <div 
          style={{
            marginBottom: "15px",
          }}
        >
          <LabeledBox
            label={ <TM k="choose_grouping_scheme"/> }
            content={
              <div className="centerer">
                <RadioButtons
                  options={[
                    {
                      id: "org",
                      active: h7y_layout === "org",
                      display: <TM k="by_org" />,
                    },
                    {
                      id: "item_type",
                      active: h7y_layout === "item_type",
                      display: <TM k="by_item_type" />,
                    },
                  ]}
                  onChange={ id => set_h7y_layout(id) }
                />
              </div>
            }
          />
        </div>
        <div>
          <form
            style={{marginBottom: "15px"}}
            onSubmit={evt => {
              evt.preventDefault()
              evt.stopPropagation()
              set_query(evt.target.querySelector('input').value);
              this.refs.focus_mount.focus();
            }}
          >
            <input 
              aria-label={text_maker("explorer_search_is_optional")}
              className="form-control input-lg"
              type="text"
              style={{width: "100%", backgroundColor: "#fafafa"}}
              placeholder={text_maker('everything_search_placeholder')}
              onChange={evt => this.handleQueryChange(evt.target.value)}
            />
            {
              window.is_a11y_mode &&
              <input 
                type="submit"
                name="search"
                value={text_maker("explorer_search")}
              />
            }
            { h7y_layout === "org" &&
              <label>
                <input
                  type="checkbox"
                  checked={!show_stat}
                  onChange={toggle_stat_filter}
                  style={{ marginRight: '1rem' }}
                />
                <TM k="show_only_votes" />
              </label>
            }
          </form>
        </div>
        <div 
          tabIndex={-1}
          className="explorer-focus-mount"
          ref="focus_mount" 
          style={{position: 'relative'}}
          aria-label={text_maker("explorer_focus_mount")}
        >
          {loading && 
            <div className="loading-overlay">
              <div style={{height: '200px',position: 'relative'}}>
                <SpinnerWrapper config_name={"sub_route"}/> 
              </div>
            </div>
          }
          {is_filtering && _.isEmpty(root.children) &&
            <div style={{fontWeight: '500', fontSize: '1.5em', textAlign: 'center'}}>  
              <TM k="search_no_results" />
            </div>
          }
          {!show_stat &&
            <div className="DiffFilterViewAlert">
              <TM k="showing_only_votes" />
            </div>
          }
          <Explorer 
            config={explorer_config}
            root={root}
            col_state={{
              sort_col,
              is_descending,
            }}
          />
        </div>
        <div
          className="h3"
          style={{textAlign: "center"}}
        >
          <TM 
            k="estimates_source_link"
            args={{href: sources.ESTIMATES.open_data[window.lang] }}
          />
        </div>
      </div>
    );
  }
}