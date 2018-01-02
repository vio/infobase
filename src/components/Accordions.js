require('./Accordions.scss');
const ReactTransitionGroup  = require('react-addons-transition-group');
const classNames = require('classnames');

function FirstChild(props) {
  const childrenArray = React.Children.toArray(props.children);
  return childrenArray[0] || null;
}

const defaultMaxHeight = "300px";
class AccordionEnterExit extends React.Component {
  componentWillLeave(done){
    const node = ReactDOM.findDOMNode(this);
    const initialHeight = node.offsetHeight;
    const that = this;
  
    d4.select(node)
      .style('opacity', 1 )
      .style('max-height', initialHeight+'px')
      .transition()
      .ease(d4.easeLinear)
      .duration(this.props.collapseDuration)
      .style('opacity', 1e-6 )
      .style('max-height', '1px')
      .on('end',function(){
        if(!that.props.cancel && document.body.contains(node)){
          done();
        }
      });

  }
  componentWillEnter(done){
    const node = ReactDOM.findDOMNode(this);
    const that = this;
    d4.select(node)
      .style('max-height', "0px")
      .style('opacity', 1e-6)
      .transition()
      .ease(d4.easeLinear)
      .duration(this.props.expandDuration)
      .style( 'max-height', this.props.maxHeight || defaultMaxHeight )
      .style('opacity', '1')
      .on('end',function(){
        d4.select(node).style('max-height', 'none' );
        if(!that.props.cancel && document.body.contains(node)){
          done();
        }
      });

  }
  render(){
    return <this.props.component {...(_.omit(this.props, ['component', 'expandDuration', 'expandDuration', 'collapseDuration', 'cancel']))} />
  }
}

/*
  title: react element to display when collapsed 
  isExpanded: true/false 
*/
const StatelessAccordion = ({ title, isExpanded, children, onToggle }) => (
  <div className="xplorer-node-container">
    <div className="xplorer-node default-blue">
      <div className="xplorer-expander-container" onClick={onToggle}>
        <button 
          className='button-unstyled xplorer-expander' 
          aria-label={isExpanded ? "Collapse this node" : "Expand this node"}
        > 
          <span className={`glyphicon glyphicon-${isExpanded ? 'minus' : 'plus'}-sign`} />
        </button>
      </div>
      <div className="xplorer-node-content-container">
        <div className="xplorer-node-intro" onClick={onToggle}>
          <header className={classNames(isExpanded && "mrgn-bttm-lg")}>
            {title}
          </header>
        </div>
        <ReactTransitionGroup component={FirstChild}>
          { isExpanded && 
          <AccordionEnterExit
            component="div"
            expandDuration={600}
            collapseDuration={600}
          >
            <div className="xplorer-node-inner-collapsible-content">
              {children}
            </div>
          </AccordionEnterExit>
          }
        </ReactTransitionGroup>
      </div>
    </div>
  </div>
);

const StatelessPullDownAccordion = ({ title, isExpanded, children, onToggle }) => (
  <div className="pull-down-accordion">
    <div className="pull-down-accordion-header" onClick={onToggle}>
      { title }
    </div> 
    <ReactTransitionGroup component={FirstChild}>
      { isExpanded && 
        <AccordionEnterExit
          component="div"
          className="pull-down-accordion-body"
          style={{paddingTop:"5px"}}
          expandDuration={600}
          collapseDuration={600}
        >
          {children}
        </AccordionEnterExit>
      }
    </ReactTransitionGroup>
    <div className="pull-down-accordion-footer" onClick={onToggle}>
      <button 
        className="button-unstyled pull-down-accordion-expander"
        aria-label={isExpanded ? "collapse above" : "expand above"}
      >
        <span 
          className={classNames(
            "glyphicon",
            isExpanded && "glyphicon-chevron-up",
            !isExpanded && "glyphicon-chevron-down" 
          )}
        />
      </button>
    </div> 
  </div>
);


class AutoAccordion extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      isExpanded: props.isInitiallyExpanded,
    }
  }
  render(){
    const { isExpanded } = this.state;
    const { usePullDown } = this.props;
    return React.createElement(
      usePullDown ? StatelessPullDownAccordion : StatelessAccordion, 
      Object.assign({}, this.props, {
        isExpanded,
        onToggle:()=> this.setState({ isExpanded : !isExpanded }),
      })
    );
  }
}

module.exports = exports = {
  FirstChild,
  AccordionEnterExit,
  StatelessPullDownAccordion,
  StatelessAccordion,
  AutoAccordion,
}