//https://gist.github.com/guglielmo/16d880a6615da7f502116220cb551498

import { StandardRouteContainer } from '../core/NavComponents.js';
import {
  Format,
  TM,
  SpinnerWrapper
} from '../util_components.js';
import {
  get_data,
  load_data
} from './data.js';
import { formats } from '../core/format.js';
import './TreeMap.scss';
import { TreeMap } from './TreeMapViz.js';
import { TreeMapControls } from './TreeMapControls.js';
import { TreeMapSidebar } from './TreeMapSidebar.js';
import { TreeMapTopbar } from './TreeMapTopBar.js';
import { IndicatorDisplay } from '../panels/result_graphs/components.js'
import { infograph_href_template } from '../infographic/routes.js';
import {
  trivial_text_maker,
  run_template
} from '../models/text.js';
import { Fragment } from 'react';
import { createBrowserHistory } from 'history';



/* NODE RENDERING FUNCTIONS */

function std_node_render(foreign_sel) {
  foreign_sel.html(function (node) {
    if (this.offsetHeight <= 30 || this.offsetWidth <= 50) { return }

    const name_to_display = (node.data.subject && node.data.subject.fancy_acronym && this.offsetWidth < 150 ? node.data.subject.fancy_acronym : node.data.name);

    let text_size = "";
    if (this.offsetHeight > 150 && this.offsetWidth > 300) { text_size = "--large" }
    if (this.offsetHeight > 50 && this.offsetWidth > 50 && this.offsetHeight <= 100) { text_size = "--small" }

    let show_amount = true;
    if (this.offsetHeight <= 50) { show_amount = false }

    let ret = `
      <div class="TreeMapNode__ContentBox TreeMapNode__ContentBox--standard">
      <div class="TreeMapNode__ContentTitle TreeMapNode__ContentTitle${text_size}">
        ${name_to_display}
      </div>
    `
    if (show_amount) {
      ret = ret + `
      <div class="TreeMapNode__ContentText TreeMapNode__ContentText${text_size}">
        ${formats.compact1(node.data.amount)}
      </div>
      `
    }
    return ret + '</div>';
  });
}

/* COLOUR SCALES */

// need this slightly tricky formulation because we only want to use part of the Blues scale (darkest colours
// are too dark for good contrast with the text)
const pos_d3_color_scale = d3.scaleSequential(d3.interpolateRgbBasis(d3.schemeBlues[9].slice(2, 7)));
pos_d3_color_scale.clamp(true); // I'm not sure if this is the default
const neg_d3_color_scale = d3.scaleSequential(d3.interpolateRgbBasis(d3.schemeReds[9].slice(3, 5)));
neg_d3_color_scale.clamp(true);
function standard_color_scale(node) {
  let color_val;
  node.data.parent_amount ? color_val = node.data.amount / node.data.parent_amount * 3 : color_val = 0;
  if (node.data.amount < 0) {
    return neg_d3_color_scale(-color_val);
  }
  return pos_d3_color_scale(color_val);
}

const d3_fte_scale = d3.scaleSequential(d3.interpolateRgbBasis(d3.schemeGreens[9].slice(2, 7)));
//d3_fte_scale.domain([0,10000]);
d3_fte_scale.clamp(true);
function fte_color_scale(node) {
  let color_val = 0;
  if (node.data.parent_ftes) { color_val = node.data.ftes / node.data.parent_ftes * 3 }
  return d3_fte_scale(color_val);
  //return d3_fte_scale(node.data.ftes);
}

const pos_d3_color_scale_log = d3.scaleSequential(d3.interpolateRgbBasis(d3.schemeGreens[9].slice(1, 7)));
pos_d3_color_scale_log.clamp(true); // I'm not sure if this is the default
const neg_d3_color_scale_log = d3.scaleSequential(d3.interpolateRgbBasis(d3.schemeReds[9].slice(1, 7)));
neg_d3_color_scale_log.clamp(true);
function spending_change_color_scale(node) {
  if (node.data.amount < 0) {
    neg_d3_color_scale_log.domain([0, 1000000000]);
    return neg_d3_color_scale_log(-node.data.amount);
  }
  pos_d3_color_scale_log.domain([0, 1000000000]);
  return pos_d3_color_scale_log(node.data.amount);
}
function fte_change_color_scale(node) {
  if (node.data.ftes < 0) {
    neg_d3_color_scale_log.domain([0, 1000]);
    return neg_d3_color_scale_log(-node.data.ftes);
  }
  pos_d3_color_scale_log.domain([0, 1000]);
  return pos_d3_color_scale_log(node.data.ftes);
}

function get_color_scale(type, color_var) {
  if (type === "org_results") {
    return null; //result_color_scale;
  } else if (type === "spending_change") {
    if (color_var && color_var === "ftes") {
      return fte_change_color_scale;
    } else {
      return spending_change_color_scale;
    }
  } else if (color_var && color_var === "ftes") {
    return fte_color_scale;
  } else {
    return standard_color_scale;
  }
}

/* TOOLTIPS */

function std_tooltip_render(tooltip_sel, color_var) {
  tooltip_sel.html(function (d) {
    let tooltip_html = `<div>
    <div>${d.data.name}</div>
    <hr class="BlueHLine">`;
    if (d.data.parent_amount) {
      tooltip_html = tooltip_html + `
      <div>${formats.compact1(d.data.amount)}
      (${formats.percentage1(d.data.amount / d.data.parent_amount)} of ${d.data.parent_name})</div>`;
    } else {
      tooltip_html = tooltip_html + `
      <div>${formats.compact1(d.data.amount)}</div>`
    }
    if (d.data.ftes) {
      if (d.data.parent_ftes) {
        tooltip_html = tooltip_html + `
        <div>${Math.round(d.data.ftes)} ${trivial_text_maker("fte")}
        (${formats.percentage1(d.data.ftes / d.data.parent_ftes)} of ${d.data.parent_name})</div>`

      } else {
        tooltip_html = tooltip_html + `
        <div>${Math.round(d.data.ftes)} ${trivial_text_maker("fte")}</div>`
      }
    }
    if (color_var == "ftes") {
      tooltip_html = tooltip_html + `
      ${generate_infograph_href(d, "people")}
      </div>`;
    } else {
      tooltip_html = tooltip_html + `
      ${generate_infograph_href(d, "financial")}
      </div>`;
    }
    return tooltip_html;
  })
}

function mobile_tooltip_render(tooltip_sel) {
  tooltip_sel.html(function (d) {
    let tooltip_html = `<div>
    <div>${d.data.name}</div>
    <hr class="BlueHLine">
    <div>${formats.compact1(d.data.amount)}</div>`;
    if (d.data.parent_amount) {
      tooltip_html = tooltip_html + `
      <div>${formats.percentage1(d.data.amount / d.data.parent_amount)} of ${d.data.parent_name}</div>`;
    }
    tooltip_html = tooltip_html + `
    ${generate_infograph_href(d)}`
    if (d3.select(this.parentNode).classed("TreeMapNode__ContentBoxContainer--has-children")) {
      tooltip_html = tooltip_html + `
      <button class="btn-primary">Zoom in</button>`
    }
    tooltip_html = tooltip_html + `
    </div>`;
    return tooltip_html;
  })
    .select("button")
    .on("click", function (d) {
      d3.select(d).transition();
    })
}

function generate_infograph_href(d, data_area) {
  if (d.data.subject) {
    return `<div style="padding-top: 10px">
      <a class="TM_Tooltip__link" href=${infograph_href_template(d.data.subject, data_area)}> ${trivial_text_maker("see_the_infographic")} </a>
    </div>`;
  } else { return '' }
}


export default class TreeMapper extends React.Component {
  constructor(props) {
    super(props);
    this.setRoute = this.setRoute.bind(this);

    this.state = {
      loading: true,
      data: false,
      route_params: props.match.params,
      org_route: [],
    };

    load_data(this.props)
      .then(() => this.setState({ loading: false }));
  }
  static getDerivedStateFromProps(props, state) {
    return {
      route_params: props.match.params,
      data: _.isEqual(props.match.params, state.route_params) ? state.data : false,
    }
  }
  componentDidUpdate() {
    const {
      loading,
      data,
    } = this.state;
    if (loading) {
      load_data(this.props)
        .then(() => this.setState({ loading: false }));
    } else if (!data) {
      this.set_data(this.props);
    }
  }
  set_data(props) {
    const {
      match: {
        params: {
          perspective,
          org_id,
          year,
          filter_var,
        },
      },
    } = props;
    const data = get_data(perspective, org_id, year, filter_var);
    this.setState({
      data: data,
      org_route: [],
    });
  }
  setRoute(new_route, reset = false) {
    let next_route = this.state.org_route;
    reset ? next_route = new_route : next_route = this.state.org_route.concat([new_route])
    this.setState({
      org_route: next_route,
    })
  }
  render() {
    const {
      history,
      location,
      match: {
        params: {
          perspective,
          color_var,
          year,
          filter_var,
        },
      },
    } = this.props;
    const {
      loading,
      data,
      org_route,
    } = this.state;

    const colorScale = get_color_scale(perspective, color_var);
    const { results_tooltip_render } = this;

    let app_height = 800;
    if (window.feature_detection.is_mobile()) {
      app_height = Math.ceil(0.8 * screen.height);
    }
    const topbar_height = 55;


    const display_year = run_template("{{" + year + "}}");
    return (
      <StandardRouteContainer
        route_key='start'
        title='tree map development'
      >
        {loading || !data ?
          <SpinnerWrapper ref="spinner" config_name={"route"} /> :
          <div>
            <div className="TreeMap__Wrapper">
              <div className="row">
                <div className="col-md-10">
                  <div className="row">
                    <div className="TreeMap__TopBar" style={{ "min-height": `${topbar_height}px` }}>
                      <TreeMapTopbar
                        history={history}
                        org_route={this.state.org_route}
                        setRouteCallback={this.setRoute}
                      />
                    </div>
                    <TreeMap
                      data={data}
                      colorScale={colorScale}
                      color_var={color_var}
                      org_route={this.state.org_route}
                      setRouteCallback={this.setRoute}
                      perspective={perspective}
                      year={year}
                      tooltip_render={
                        window.feature_detection.is_mobile() ? mobile_tooltip_render : std_tooltip_render
                      }
                      node_render={std_node_render}
                      viz_height={app_height - topbar_height}
                    />
                  </div>
                </div>
                <div className="col-md-2 TreeMap__SideBar" style={{ padding: "0px", "min-height": `${app_height + 9}px` }}>
                  <TreeMapSidebar
                    side_bar_title={display_year}
                    perspective={perspective}
                    color_var={color_var}
                    year={year}
                    filter_var={filter_var}
                    history={history}
                    location={location}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: "200px" }} />
          </div>
        }
      </StandardRouteContainer>
    );
  }
}