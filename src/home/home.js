import "./home.ib.yaml";
import './home.scss';
import get_home_content from './home-data.js';
import { log_standard_event } from '../core/analytics.js';
import MediaQuery from 'react-responsive';

import { 
  EverythingSearch,
  TM,
  SpinnerWrapper,
  CardTopImage,
  CardCenteredImage,
  CardBackgroundImage,
} from '../util_components.js';

import { general_href_for_item } from '../link_utils.js';
import { text_maker } from '../models/text.js';
import { ensure_loaded } from '../core/lazy_loader.js';
import { ResultCounts } from '../models/results.js';
import { Table } from '../core/TableClass.js';

import { StandardRouteContainer } from '../core/NavComponents.js';



export class Home extends React.Component {
  constructor(){
    super()
    this.state = { loading: true};
  }
  componentDidMount(){
    ensure_loaded({
      table_keys: ['table5','table10'],
      info_deps: [ 
        'table10_gov_info',
        'stat_keys',
      ],
      require_result_counts: true,
    }).then( ()=> { 
      this.setState({loading: false}) 
    })

  }
  render(){

    const { featured_content_items } = get_home_content();

    if(this.state.loading){
      return (
        <StandardRouteContainer route_key="start">
          <SpinnerWrapper scale={4} />
        </StandardRouteContainer>
      );
    } else {
      const table5 = Table.lookup('table5');
      const table10 = Table.lookup('table10');
      const { drr16_past_total, drr16_indicators_past_success }= ResultCounts.get_gov_counts();

     
      return (
        <StandardRouteContainer route_key="start">
          <MediaQuery minWidth={992}>
            {is_large =>
              <div> 
                <HomeLayout
                  past_targets_met={drr16_indicators_past_success}
                  past_targets_total={drr16_past_total}
                  spent_last_year={table5.col_from_nick('{{pa_last_year}}').formula(table5.data)}
                  headcount_last_year={table10.col_from_nick('{{ppl_last_year}}').formula(table10.data)}
                  is_large={is_large}
                  featured_content_items={featured_content_items}
                />
              </div>
            }
          </MediaQuery>
        </StandardRouteContainer>
      );

    }
  }

}

const FeaturedContentItem = ({ text_key, href, is_new }) => <li className="list-group-item list-group-item--home">
  { is_new && <span className="badge badge--is-new"> new </span> }
  <a href={href}> <TM k={text_key} /> </a>
</li>;

const TrinityItem = ({img_url, title, href}) => <div className="centerer">
  <a href={href} className="TrinityItem">
    <div className="TrinityItem__Title">
      {title}
    </div>
    <div className="TrinityItem__Img">
      <img src={img_url} />
    </div>
  </a>
</div>;

const HomeLayout = props => (
  <div className="home-root">
    <div 
      className="intro-box" 
      style={{
        position:"relative", 
        backgroundImage:`URL(${CDN_URL}/svg/backbanner.svg)`,
      }}
    >
      <div className="container">
        <h1> <TM k="welcome" /> </h1>
        <h2> <TM k="home_sub_title" /> </h2>
        <div className="flag">
          <img src={'svg/flagline.svg'}/>
        </div>
      </div>
    </div>
    <div className="container">
      <div className="home-trinity-container">
        <div className="frow">
          <div className="col-md-4">
            <TrinityItem 
              href="#orgs/gov/gov/infograph/financial"
              img_url='svg/expend.svg'
              title={<TM k="home_finance_title" />}
            />
          </div>
          <div className="col-md-4">
            <TrinityItem 
              href="#orgs/gov/gov/infograph/people"
              img_url='svg/people.svg' 
              title={<TM k="home_ppl_title" />}
            />
          </div>
          <div className="col-md-4">
            <TrinityItem
              href="#orgs/gov/gov/infograph/results"
              img_url='svg/results.svg' 
              title={<TM k="home_results_title" />}
            />
          </div>
        </div>
      </div>
    </div>

    <div className="container">
      <div className="home-body">
        <div className="frow home-cols">
          <div className="fcol-md-7 home-col">
            <div className="col-content featured-col-content partition-budget-home-content">
              <CardCenteredImage
                img_src="svg/partition-budget.svg"
                title_key="budget_home_title"
                text_key="budget_home_text"
                link_key="check_home_link"
                link_href="#budget-measures/budget-measure"
              />
            </div>     
          </div>
          <div className="fcol-md-5 home-col">
            <header className="h3">
              <TM k="home_search_bar_title" />
            </header> 
            <div className="search-box">
              <div className="search-container home-search-container">
                <EverythingSearch 
                  include_gov={false} 
                  search_text={text_maker('everything_search_placeholder')}
                  large={true}
                  include_tags={true}
                  include_programs={true}
                  include_crsos={true}
                  include_tables={true} 
                  include_glossary={true}
                  org_scope="orgs_with_data_with_gov"
                  href_template={ general_href_for_item }
                  onNewQuery={ query => { 
                    log_standard_event({
                      SUBAPP: "home",
                      SUBJECT_GUID: null, 
                      MISC1: "home_search",
                      MISC2: query,
                    });
                  }}
                />
              </div>
            </div>

            <section>
              <header className="h3">
                <TM k="featured_data_title" />
              </header>
              <div>
                <ul className="list-group list-group--quick-links">
                  { _.map( props.featured_content_items, item => <FeaturedContentItem key={item.text_key} {...item} /> ) }
                </ul>
              </div>
            </section>  
          </div>
        </div>
      </div>
    </div>

            
    <div className="home-bg" style={{position:"relative"}}>
      <div className="container">
        <CardBackgroundImage
          img_src="svg/partition.svg"
          title_key="partition_home_title"
          text_key="partition_home_text"
          link_key="check_home_link"
          link_href="#partition/dept/exp"
          is_ellen_image
        />
      </div>
    </div>

    <div className="container">
      <div className="xtralinks">
        <div className='frow'>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/bubbles.svg"
                title_key="planet_home_title"
                text_key="planet_home_text"
                link_href="#explore-dept"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/explorer.svg"
                title_key="explorer_home_title"
                text_key="explorer_home_text"
                link_href="#resource-explorer"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/builder.svg"
                title_key="home_build_a_report"
                text_key="report_builder_home_desc"
                link_href="#rpb"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/structure.svg"
                title_key="igoc_home_title"
                text_key="igoc_home_desc"
                link_href="#igoc"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/glossary.svg"
                title_key="glossary_home_title"
                text_key="glossary_home_desc"
                link_href="#glossary"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/metadata.svg"
                title_key="metadata_home_title"
                text_key="metadata_home_desc"
                link_href="#metadata"
              />
            </section>
          </div>
          <div className="fcol-md-4 linkcard">
            <section className="explore-col-content">
              <CardTopImage
                img_src="svg/aboutus.svg"
                title_key="about_home_title"
                text_key="about_home_desc"
                link_href="#about"
              />
            </section>
          </div>
        </div>
      </div>
    </div> 
  </div>
);
