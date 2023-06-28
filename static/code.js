/* global document, window, fetch, cytoscape */

let style =
    [{
        "selector": "node",
        "style": {
        }
    }, {
        "selector": "node[label]",
        "style": {
            "label": "data(label)"
        }
    }, {
        "selector": "edge",
        "style": {
            "width": 1,
            "curve-style": "straight",
            'line-color': '#000',
            'target-arrow-color': '#000'
        }
    }, {
        "selector": "edge[arrow]",
        "style": {
            "target-arrow-shape": "data(arrow)"
        }
    }, {
        "selector": "edge.hollow",
        "style": {
            "target-arrow-fill": "hollow"
        }
    },
    {
        "selector": ".place",
        "style": {
            "shape": "ellipse",
            "text-wrap": "wrap",
            "width": 50,
            "height": 50,
            "text-valign": "top",
            "text-halign": "right",
            'background-color': '#FFF',
            'border-color': '#000',
            'border-width': 2,
        }
    },
    {
        "selector": ".transition",
        "style": {
            "shape": "round-diamond",
            "text-wrap": "wrap",
            "width": 35,
            "height": 35,
            "text-valign": "center",
            "text-halign": "center",
            'background-color': '#000',
            'border-color': '#000',
        }
    },];

let elements = [
    { "data": { "id": "T0" }, "classes": "transition" },
    { "data": { "id": "P0", "label": "p0_name\n5 :: 3/1/1" }, "classes": "place" },
    { "data": { "id": "P1", "label": "p1_name\n5 :: 3/1/1" }, "classes": "place" },
    { "data": { "id": "P2", "label": "p2_name\n3 :: 0/0/0" }, "classes": "place" },
    { "data": { "id": "T0->P0", "source": "T0", "target": "P0", "arrow": "triangle" } },
    { "data": { "id": "T0->P2", "source": "T0", "target": "P2", "arrow": "triangle" } },
    { "data": { "id": "P1->T0", "source": "P1", "target": "T0", "arrow": "triangle" } },
];

(function () {
    window.cy = cytoscape({
        container: document.getElementById('cy'),
        layout: {
            name: 'grid'
        },
        style: style,
        elements: elements
    });

    cy.layout({ name: 'cose' }).run();

    cy.on('dbltap', function( evt ){
        var tgt = evt.target || evt.cyTarget; // 3.x || 2.x

        if( tgt === cy ){
            cy.add({
                classes: 'place',
                data: { id: 'PP4', label: "pNNN_name\n3 :: 0/0/0" },
                position: {
                    x: evt.position.x,
                    y: evt.position.y
                }
            });
        }
    });
})();