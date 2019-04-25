export function pageRange (group) {
  let { pages, rotations } = group;

  pages.sort((a, b) => {
    return a - b;
  });

  pages = pages.filter((item, i) => {
    return pages.indexOf(item) >= i
  }).map((item) => item + 1)

  let ranges = []

  for (let i = 0; i < pages.length; i++) {
    if ((rotations[i] > 0)) {
      let direction;
      switch(rotations[i]) {
        case 90:
          direction = 'east';
          break;
        case 180:
          direction = 'south';
          break;
        case 270:
          direction = 'west';
          break;
        default:
          direction = '';
      };
      ranges.push([`${pages[i]}${direction}`])
    } else if (rotations[i - 1] > 0) {
      ranges.push([pages[i]])
    } else if (i > 0 && (pages[i - 1] === pages[i] - 1)) {
      const currentRange = ranges[ranges.length - 1]
      currentRange.push(pages[i])
    } else {
      ranges.push([pages[i]])
    }
  }

  return ranges.map((range) => {
    if (range.length > 1) {
      return `${range[0]}-${range[range.length - 1]}`
    }
    return range.toString();
  }).join(',');
}