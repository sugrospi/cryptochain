import React, { Component } from 'react';
import Block from './Block';
import {Link} from 'react-router-dom';
import { Button } from 'react-bootstrap';

class Blocks extends Component {
    state = { blocks: [] , paginatedId: 1, blocksLength: 0};
    
    componentDidMount(){
        
        // fetch(`${document.location.origin}/api/blocks`)
        // .then(response => response.json())
        // .then(json => this.setState({ blocks: json }));
        fetch(`${document.location.origin}/api/blocks/length`)
        .then(response => response.json())
        .then(json => this.setState({ blocksLength: json}));
        this.fetchPaginatedBlocks(this.state.paginatedId)();
    }

    fetchPaginatedBlocks = paginatedId => () => {
        fetch(`${document.location.origin}/api/blocks/${paginatedId}`)
        .then(response => response.json())
        .then(json => this.setState({ blocks : json }));
    }
    render() {
        // console.log('this.state is',this.state);
        return (
            <div>
                <div><Link to='/'>Home</Link></div>
                <h3>Blocks</h3>
                <div>
                    {
                        [...Array(Math.ceil(this.state.blocksLength/5)).keys()].map( key =>{
                            const paginatedId = key +1;
                            return (
                                    <span key={key}>
                                        <Button bsSize="small" bsStyle="danger" onClick={this.fetchPaginatedBlocks(paginatedId)}>
                                            {paginatedId}
                                        </Button>{' '}
                                    </span>
                            )
                        })

                    }
                </div>
                {
                    this.state.blocks.map(block =>{
                        return (
                            // <div key = {block.hash} className='Block'>{block.hash}</div>
                            <Block key={block.hash} block={block} />
                        );
                    })
                }
            </div>
        );
    }
}

export default Blocks;