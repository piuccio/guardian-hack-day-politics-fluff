import mps from 'data/mps.json!';
import parties from 'data/parties.json!';
import corpus from 'data/corpus.json!';
import d3 from 'd3';
import nv from 'nv/build/nv.d3.min';

var leaders = [{
		name: 'Miliband, Edward',
		image: 'styles/miliband.jpg'
	}, {
		name: 'Cameron, David',
		image: 'styles/cameron.jpg'
	}, {
		name: 'Clegg, Nick',
		image: 'styles/clegg.jpg'
	}, {
		name: 'Farage, Nigel',
		image: 'styles/farage.jpg'
	}, {
		name: 'Sturgeon, Nicola',
		image: 'styles/sturgeon.jpg'
	}, {
		name: 'Bennett, Natalie',
		image: 'styles/bennett.jpg'
	}],
	mpCard = $('.js-mp-card'),
	mpImage = $('.js-mp-image'),
	topLeaders = $('.js-top-leaders'),
	resultsList = $('.js-search-results');

$('#js-search').autocomplete({
	source: getSource(),
	select: function (event, ui) {
		show(ui.item.type, ui.item.data, generateSearchNode());
	}
});

$(document.body).on('click', '.js-keywords', function (event) {
	event.preventDefault();
	$('.js-content').addClass('js-collapsed');
	$('.js-extra').removeClass('js-collapsed');
});
$(document.body).on('click', '.js-close-extra', function (event) {
	event.preventDefault();
	$('.js-content').removeClass('js-collapsed');
	$('.js-extra').addClass('js-collapsed');
});
$(document.body).on('mouseover', '.js-keywords a, .js-extra .bar-container', function (event) {
	event.preventDefault();
	var target = $(event.currentTarget),
		key = target.data('key');
	$('[data-key=' + key + ']').addClass('selected');
});
$(document.body).on('mouseleave', '.js-keywords a, .js-extra .bar-container', function (event) {
	event.preventDefault();
	var target = $(event.currentTarget),
		key = target.data('key');
	$('[data-key=' + key + ']').removeClass('selected');
});
$(document.body).on('click', '.bar-container', function (event) {
	event.preventDefault();
	$(event.currentTarget).next().toggle();
});


leaders.forEach(function (who, index) {
	var container, data, card;
	if (index % 3 === 0) {
		container = $('<div class="row"></div>').appendTo(topLeaders);
	} else {
		container = topLeaders.children().last();
	}

	card = mpCard.clone().appendTo(container);
	card.find('.js-card-content').before(mpImage.clone());
	card.find('.js-main-image').attr('src', who.image);
	card.find('.js-title').last().remove();
	for (var i = 0; i < mps.length; i += 1) {
		if (who.name === mps[i].name) {
			data = mps[i];
			break;
		}
	}
	show('mp', data || who, card);
});

function getSource () {
	var source = [];
	// parties.forEach(function (party, i) {
	// 	source.push({
	// 		value: party,
	// 		type: 'party',
	// 		data: party
	// 	});
	// });
	mps.forEach(function (mp, i) {
		source.push({
			value: mp.name,
			type: 'mp',
			data: mp
		});
	});
	return source;
}

function show (type, data, node) {
	if (type === 'mp') {
		var tokens = data.name.split(', '),
			name = tokens[1] + ' ' + tokens[0],
			id = name.toLowerCase();

		fetch(id, function (result) {
			var card = node;
			card.find('.js-title').text(name);
			card.find('.js-name').text(rename(data.name));
			card.find('.js-party').text(data.party);
			card.find('.js-while-loading').removeClass('js-while-loading');
			card.find('.js-profile').attr('href', data.profile);
			var keywords = card.find('.js-keywords');
			card.find('.js-keywords').append($(result.mostPopularKeys.slice(0, 10).map(function (word) {
				return '<a data-key="' + word.term.replace(/ /g, '_') + '">' + word.term + '</a>';
			}).join(', ')));
			createGraph(card, result.mostPopularKeys);
			card.show();
		});
	}
}

function generateSearchNode () {
	var length = resultsList.find('.js-mp-card').length,
		container;
	if (length % 3 === 0) {
		container = $('<div class="row"></div>').appendTo(resultsList);
	} else {
		container = resultsList.children().last();
	}
	return mpCard.clone().appendTo(container);
}

function fetch (name, callback) {
	if (corpus[name]) {
		callback(corpus[name]);
	} else {
		$.getJSON('http://localhost:8181/mp/' + encodeURIComponent(name)).done(callback);
	}
}

function rename (name) {
	var tokens = name.split(',');
	return tokens[1];
}

function createGraphD3 (card, keys) {
	console.log(keys);
	var series = {
		key: 'Frequency',
		color: '#4f99b4',
		values: keys.map(function (key) { return {
			label: key.term,
			value: key.tf
		}; })
	};

	nv.addGraph(function() {
		var chart = nv.models.multiBarHorizontalChart()
			.x(function(d) { return d.label; })
			.y(function(d) { return d.value; })
			.margin({top: 30, right: 20, bottom: 50, left: 175})
			.showValues(true)           //Show bar value next to each bar.
			.tooltips(true)             //Show tooltips on hover.
			.showControls(true);        //Allow user to switch between "Grouped" and "Stacked" mode.

		chart.yAxis
			.tickFormat(d3.format(',.2f'));

		d3.select(card.find('.js-graph svg')[0])
			.datum([series])
			.call(chart);

		nv.utils.windowResize(chart.update);

		return chart;
	});
}

function createGraph (card, keys) {
	var table = '<table><tbody>';
	keys.forEach(function (key) {
		table += '<tr class="bar-container" data-key="' +
			key.term.replace(/ /g, '_') + '"><td class="key-term">' + key.term +
			'</td><td class="bar-value" data-value="' + key.tf + '"><div style="width:' + getWidth(keys[0], key) + '">&nbsp;</div></td></tr>' +
			'<tr class="list-articles"><td colspan="2"><ul>';

		key.articles.slice(0, 5).forEach(function (article) {
			table += '<li><a href="' + article.webUrl + '">' + article.webTitle + '</a></li>';
		});

		table += '</ul></td></tr>';
	});
	table += '</tbody></table>';
	console.log($(table));

	card.find('.js-extra').append($(table));
}

function getWidth (first, current) {
	return (current.tf / first.tf * 100).toFixed(2) + '%';
}