import { createReadStream, existsSync, statSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { dirname, join as joinPaths } from 'path'
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Dictionary<K extends string | number | symbol = string, V = string> = { [key in K]?: V }
type TupleOf<T, N extends number, R extends readonly unknown[]> = R['length'] extends N ? R : TupleOf<T, N, readonly [T, ...R]>
type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : TupleOf<T, N, []> & { length: N } : never
type MutableTupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : MutableTupleOf<T, N, [T, ...R]>
type MutableTuple<T, N extends number> = N extends N ? number extends N ? T[] : MutableTupleOf<T, N, []> & { length: N } : never
type Enumerate<N extends number, Acc extends readonly number[] = []> = Acc['length'] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc['length']]>
type NumberRange<Lower extends number, Upper extends number> = Exclude<Enumerate<Upper>, Enumerate<Lower>>

enum TileType {
    EMPTY_SPACE = 0,
    TREASURE = 1,
    MONSTER = 2,
    WALL = 3
}

const NUMBER_OF_TILE_TYPES = 4
const RAW_SIDE_LENGTH = 8
const RAW_SIDE_LENGTH_PLUS = 9
const SIDE_LENGTH = 10

type NumberOfTileTypeRange = NumberRange<0, 4>
type RawDiagram = Tuple<Tuple<TileType, typeof RAW_SIDE_LENGTH>, typeof RAW_SIDE_LENGTH>
type DiagramRow = MutableTuple<TileType, typeof SIDE_LENGTH>
type Diagram = MutableTuple<DiagramRow, typeof SIDE_LENGTH>
type NumberOfTilesRange = NumberRange<0, typeof RAW_SIDE_LENGTH_PLUS>
type Projection = Tuple<NumberOfTilesRange, typeof RAW_SIDE_LENGTH>
type MutableProjection = MutableTuple<NumberOfTilesRange, typeof RAW_SIDE_LENGTH>
type ColorSet = Dictionary<number, number>

function duplicate<T>(value: T, length: number): T[] {
    const array = new Array<T>(length)

    for (let i = 0; i < length; i += 1) {
        if (Array.isArray(value)) {
            array[i] = Array.from(value) as T
        } else {
            array[i] = value
        }
    }

    return array
}

function getTileType(value: NumberOfTileTypeRange): TileType {
    switch (value) {
        case 0:
            return TileType.EMPTY_SPACE
        case 1:
            return TileType.TREASURE
        case 2:
            return TileType.MONSTER
        case 3:
            return TileType.WALL
        default:
            return TileType.EMPTY_SPACE
    }
}

async function readInputFile(file_name: string): Promise<readonly string[] | null> {
    const file_path = joinPaths(__dirname, `../input/${file_name}`)

    if (!existsSync(file_path)) {
        console.log(`@main> File "${file_name}" doesn\'t exist.`)
        return null
    }

    if (!statSync(file_path).isFile()) {
        console.log(`@main> File "${file_name}" isn\'t readable.`)
        return null
    }

    const file_stream = createReadStream(file_path)
    const lines_reader = createInterface({
        input: file_stream,
        crlfDelay: Infinity
    })
    const lines: string[] = []

    for await (const line of lines_reader) {
        lines.push(line)
    }

    return lines
}

function writeOutputFile(file_name: string, content: string) {
    const file_path = joinPaths(__dirname, `../output/${file_name}`)
    writeFileSync(file_path, content)
}

async function parseInputFile(file_name: string):
    Promise<readonly [Projection, Projection, RawDiagram] | null> {
    const lines = await readInputFile(file_name)

    if (lines === null) {
        return null
    }

    const raw_diagram = duplicate(
        new Array<TileType>(RAW_SIDE_LENGTH).fill(TileType.EMPTY_SPACE),
        RAW_SIDE_LENGTH)
    const row_projection = new Array<NumberOfTilesRange>(RAW_SIDE_LENGTH).fill(0)
    const column_projection = new Array<NumberOfTilesRange>(RAW_SIDE_LENGTH).fill(0)
    let number_of_lines = 0
    let number_of_nonempty_lines = 0

    for (const line of lines) {
        const trimmed_line = line.trim()

        number_of_lines += 1

        if (trimmed_line === '') {
            continue
        }

        number_of_nonempty_lines += 1

        const values = trimmed_line.split(/[ \f\t\v]+/).map(x => parseInt(x))

        if (values.length !== RAW_SIDE_LENGTH) {
            console.log(`@main> File "${file_name}" has ${values.length} numbers ${values.length < RAW_SIDE_LENGTH ? 'less' : 'more'} than ${RAW_SIDE_LENGTH} at line ${number_of_lines}.`)
            return null
        }

        for (let i = 0; i < values.length; i += 1) {
            if (isNaN(values[i]) || values[i] < 0 ||
                values[i] > (number_of_nonempty_lines <= 2 ? RAW_SIDE_LENGTH : NUMBER_OF_TILE_TYPES - 1)) {
                console.log(`@main> File "${file_name}" contains illegal value at line ${number_of_lines}.`)
                return null
            }

            if (number_of_nonempty_lines === 1) {
                row_projection[i] = values[i] as NumberOfTilesRange
            } else if (number_of_nonempty_lines === 2) {
                column_projection[i] = values[i] as NumberOfTilesRange
            } else if (number_of_nonempty_lines > 2 &&
                number_of_nonempty_lines <= RAW_SIDE_LENGTH + 2) {
                raw_diagram[number_of_nonempty_lines - 3][i] =
                    getTileType(values[i] as NumberOfTileTypeRange)
            }
        }
    }

    if (number_of_nonempty_lines !== RAW_SIDE_LENGTH + 2) {
        console.log(`@main> File "${file_name}" has ${number_of_nonempty_lines} non-empty lines ${number_of_nonempty_lines < RAW_SIDE_LENGTH + 2 ? 'less' : 'more'} than ${RAW_SIDE_LENGTH + 2}.`)
        return null
    }

    return [
        row_projection as unknown as Projection,
        column_projection as unknown as Projection,
        raw_diagram as unknown as RawDiagram
    ]
}

function augmentRawDiagram(raw_diagram: RawDiagram): Diagram {
    const diagram =
        duplicate(new Array<TileType>(SIDE_LENGTH).fill(TileType.WALL), SIDE_LENGTH)

    diagram[0] = duplicate(TileType.WALL, SIDE_LENGTH)
    diagram[SIDE_LENGTH - 1] = duplicate(TileType.WALL, SIDE_LENGTH)

    for (let x = 0; x < RAW_SIDE_LENGTH; x += 1) {
        for (let y = 0; y < RAW_SIDE_LENGTH; y += 1) {
            diagram[x + 1][y + 1] = raw_diagram[x][y]
        }
    }

    return diagram as Diagram
}

function getAsciiDiagram(diagram: Diagram, is_render_all: boolean = false): string {
    let result: string[] = []
    const start: number = is_render_all ? 0 : 1
    const end: number = is_render_all ? SIDE_LENGTH : SIDE_LENGTH - 1

    for (let x = start; x < end; x += 1) {
        let line: string[] = []

        for (let y = start; y < end; y += 1) {
            switch (diagram[x][y]) {
                case TileType.EMPTY_SPACE:
                    line.push('-')
                    break
                case TileType.TREASURE:
                    line.push('T')
                    break
                case TileType.MONSTER:
                    line.push('M')
                    break
                case TileType.WALL:
                    line.push('#')
                    break
                default:
                    break
            }
        }

        result.push(line.join(''))
    }

    return result.join('\n')
}

function isTilePlacable(row_i: number, column_i: number,
    cur_row_projection: Projection, cur_column_projection: Projection,
    row_projection: Projection, column_projection: Projection): boolean {

    if (!(row_i in cur_row_projection && row_i in row_projection &&
        column_i in cur_column_projection && column_i in column_projection)) {
        return false
    }

    return cur_row_projection[row_i] + 1 <= row_projection[row_i] &&
        cur_column_projection[column_i] + 1 <= column_projection[column_i]
}

function getHashId(x: number, y: number): number {
    return x * 100 + y
}

function isSatisfiedProjections(cur_row_projection: Projection, cur_column_projection: Projection,
    row_projection: Projection, column_projection: Projection): boolean {
    if (!(cur_row_projection.length === row_projection.length &&
        cur_column_projection.length === column_projection.length)) {
        return false
    }

    for (let i = 0; i < cur_row_projection.length; i += 1) {
        if (cur_row_projection[i] !== row_projection[i]) {
            return false
        }
    }

    for (let i = 0; i < cur_column_projection.length; i += 1) {
        if (cur_column_projection[i] !== column_projection[i]) {
            return false
        }
    }

    return true
}

function get4DirectionCoords(x: number, y: number): readonly Coordinate[] {
    return [
        { x: x, y: y - 1 }, { x: x + 1, y: y },
        { x: x, y: y + 1 }, { x: x - 1, y: y }
    ]
}

function getTRoomLTCoords(x: number, y: number): readonly Coordinate[] {
    return [
        { x: x - 2, y: y - 2 }, { x: x - 1, y: y - 2 }, { x: x, y: y - 2 },
        { x: x - 2, y: y - 1 }, { x: x - 1, y: y - 1 }, { x: x, y: y - 1 },
        { x: x - 2, y: y }, { x: x - 1, y: y }, { x: x, y: y }
    ]
}

function getTRoomTileCoords(x: number, y: number): readonly Coordinate[] {
    return [
        { x: x, y: y }, { x: x + 1, y: y }, { x: x + 2, y: y },
        { x: x, y: y + 1 }, { x: x + 1, y: y + 1 }, { x: x + 2, y: y + 1 },
        { x: x, y: y + 2 }, { x: x + 1, y: y + 2 }, { x: x + 2, y: y + 2 }
    ]
}

function getTRoomOuterTileCoords(x: number, y: number): readonly Coordinate[] {
    return [
        { x: x, y: y - 1 }, { x: x + 1, y: y - 1 }, { x: x + 2, y: y - 1 },
        { x: x + 3, y: y }, { x: x + 3, y: y + 1 }, { x: x + 3, y: y + 2 },
        { x: x, y: y + 3 }, { x: x + 1, y: y + 3 }, { x: x + 2, y: y + 3 },
        { x: x - 1, y: y }, { x: x - 1, y: y + 1 }, { x: x - 1, y: y + 2 }
    ]
}

function get4TilesSpaces(x: number, y: number): readonly Coordinate[][] {
    return [
        [{ x: x - 1, y: y - 1 }, { x: x, y: y - 1 }, { x: x - 1, y: y }],
        [{ x: x, y: y - 1 }, { x: x + 1, y: y - 1 }, { x: x + 1, y: y }],
        [{ x: x + 1, y: y }, { x: x + 1, y: y + 1 }, { x: x, y: y + 1 }],
        [{ x: x, y: y + 1 }, { x: x - 1, y: y + 1 }, { x: x - 1, y: y }]
    ]
}

function isContainedByTRoom(x: number, y: number,
    treasure_room_lt_coords: readonly Coordinate[]): boolean {
    for (const lt_coord of treasure_room_lt_coords) {
        if (x >= lt_coord.x && x < lt_coord.x + 3 &&
            y >= lt_coord.y && y < lt_coord.y + 3) {
            return true
        }
    }

    return false
}

function isTRoomLTCoordAvailable(x: number, y: number): boolean {
    return x >= 1 && x < SIDE_LENGTH - 2 &&
        y >= 1 && y < SIDE_LENGTH - 2
}

function isTRoomTilesAvailable(x: number, y: number, diagram: Diagram): boolean {
    let number_of_empty_spaces = 0
    let number_of_treasuers = 0

    for (const tile_coord of getTRoomTileCoords(x, y)) {
        switch (diagram[tile_coord.x][tile_coord.y]) {
            case TileType.EMPTY_SPACE:
                number_of_empty_spaces += 1
                break
            case TileType.TREASURE:
                number_of_treasuers += 1
                break
            default: break
        }
    }

    return number_of_empty_spaces === 8 && number_of_treasuers === 1
}

function isTRoomWallsAvailable(x: number, y: number, diagram: Diagram): boolean {
    let number_of_walls = 0

    for (const outer_tile_coord of getTRoomOuterTileCoords(x, y)) {
        if (diagram[outer_tile_coord.x][outer_tile_coord.y] === TileType.WALL) {
            number_of_walls += 1
        }
    }

    return number_of_walls === 11
}

function isDeadEnds(x: number, y: number, diagram: Diagram): boolean {
    let number_of_walls = 0

    for (const outer_tile_coord of get4DirectionCoords(x, y)) {
        if (diagram[outer_tile_coord.x][outer_tile_coord.y] === TileType.WALL) {
            number_of_walls += 1
        }
    }

    return number_of_walls === 3
}

function checkEmptySpacesConnectivity(diagram: Diagram): boolean {
    const color_set: ColorSet = {}
    let sign_count = 0

    function bfs(x: number, y: number, sign: number) {
        const queue: Coordinate[] = [{ x: x, y: y }]

        while (queue.length > 0) {
            const head = queue.shift()

            if (head === undefined) {
                break
            }

            const hash_id = getHashId(head.x, head.y)

            if (hash_id in color_set) {
                continue
            }

            color_set[hash_id] = sign

            for (const coord of get4DirectionCoords(head.x, head.y)) {
                if (diagram[coord.x][coord.y] === TileType.EMPTY_SPACE &&
                    !(getHashId(coord.x, coord.y) in color_set)) {
                    queue.push(coord)
                }
            }
        }
    }

    for (let x = 1; x < SIDE_LENGTH - 1; x += 1) {
        for (let y = 1; y < SIDE_LENGTH - 1; y += 1) {
            const hash_id = getHashId(x, y)

            if (diagram[x][y] === TileType.EMPTY_SPACE) {
                if (hash_id in color_set) {
                    if (sign_count <= 1) {
                        continue
                    }

                    return false
                }

                if (sign_count !== 0) {
                    return false
                }

                sign_count += 1
                bfs(x, y, sign_count)
            }
        }
    }

    return true
}

function checkTreasuresAndMonstersConnectivity(treasure_coords: readonly Coordinate[],
    monster_coords: readonly Coordinate[],
    diagram: Diagram): boolean {
    const color_set: ColorSet = {}
    let sign_count = 0

    function bfs(x: number, y: number, sign: number) {
        const queue: Coordinate[] = [{ x: x, y: y }]

        while (queue.length > 0) {
            const head = queue.shift()

            if (head === undefined) {
                break
            }

            const hash_id = getHashId(head.x, head.y)

            if (hash_id in color_set) {
                continue
            }

            color_set[hash_id] = sign

            for (const coord of get4DirectionCoords(head.x, head.y)) {
                if (diagram[coord.x][coord.y] !== TileType.WALL &&
                    !(getHashId(coord.x, coord.y) in color_set)) {
                    queue.push(coord)
                }
            }
        }
    }


    for (const coord of [...treasure_coords, ...monster_coords]) {
        const x = coord.x
        const y = coord.y
        const hash_id = getHashId(x, y)

        if (diagram[x][y] !== TileType.WALL) {
            if (hash_id in color_set) {
                if (sign_count <= 1) {
                    continue
                }

                return false
            }

            if (sign_count !== 0) {
                return false
            }

            sign_count += 1
            bfs(x, y, sign_count)
        }
    }

    return true
}

function checkMonsters(monster_coords: readonly Coordinate[], diagram: Diagram): boolean {
    for (const monster_coord of monster_coords) {
        const x = monster_coord.x
        const y = monster_coord.y

        if (diagram[x][y] === TileType.MONSTER &&
            !isDeadEnds(x, y, diagram)) {
            return false
        }
    }

    return true
}

function checkTreasureRooms(treasure_coords: readonly Coordinate[], diagram: Diagram):
    [boolean, readonly Coordinate[]] {
    const treasure_room_lt_coords: Coordinate[] = []

    for (const treasure_coord of treasure_coords) {
        const x = treasure_coord.x
        const y = treasure_coord.y

        if (diagram[x][y] === TileType.TREASURE) {
            const lt_coords = getTRoomLTCoords(x, y)
            let is_satisfied = false

            for (const lt_coord of lt_coords) {
                if (!isTRoomLTCoordAvailable(lt_coord.x, lt_coord.y)) {
                    continue
                }

                if (!isTRoomTilesAvailable(lt_coord.x, lt_coord.y, diagram)) {
                    continue
                }

                if (!isTRoomWallsAvailable(lt_coord.x, lt_coord.y, diagram)) {
                    continue
                }

                is_satisfied = true
                treasure_room_lt_coords.push(lt_coord)
                break
            }

            if (!is_satisfied) {
                return [false, []]
            }
        }
    }

    return [true, treasure_room_lt_coords]
}

interface Coordinate {
    x: number
    y: number
}

function isSolved(treasure_coords: readonly Coordinate[], monster_coords: readonly Coordinate[], diagram: Diagram): boolean {
    function checkMonstersAndDeadEnds(): boolean {
        for (const monster_coord of monster_coords) {
            const x = monster_coord.x;
            const y = monster_coord.y;

            if (!isDeadEnds(x, y, diagram)) {
                return false;
            }
        }

        for (let x = 1; x < SIDE_LENGTH - 1; x += 1) {
            for (let y = 1; y < SIDE_LENGTH - 1; y += 1) {
                if (diagram[x][y] === TileType.EMPTY_SPACE &&
                    isDeadEnds(x, y, diagram)) {
                    return false
                }
            }
        }

        return true
    }

    function checkHallways(treasure_room_lt_coords: readonly Coordinate[]): boolean {
        for (let x = 1; x < SIDE_LENGTH - 1; x += 1) {
            for (let y = 1; y < SIDE_LENGTH - 1; y += 1) {
                if (diagram[x][y] === TileType.EMPTY_SPACE &&
                    !isContainedByTRoom(x, y, treasure_room_lt_coords)) {
                    if (get4TilesSpaces(x, y).map(
                        space => space.map(
                            coord => diagram[coord.x][coord.y] === TileType.EMPTY_SPACE && !isContainedByTRoom(
                                coord.x, coord.y, treasure_room_lt_coords) ? 1 : 0 as number
                        ).reduce((pre, cur) => pre + cur, 0) >= 3 ? 1 : 0 as number
                    ).reduce((pre, cur) => pre + cur, 0) > 0) {
                        return false
                    }
                }
            }
        }

        return true
    }

    const flag_connectivity = checkEmptySpacesConnectivity(diagram)
    if (!flag_connectivity) {
        return false
    }

    const [flag_treasures, treasure_room_lt_coords] =
        checkTreasureRooms(treasure_coords, diagram)
    if (!flag_treasures) {
        return false
    }

    const flag_monsters = checkMonstersAndDeadEnds()
    if (!flag_monsters) {
        return false
    }

    const falg_hallways = checkHallways(treasure_room_lt_coords)
    if (!falg_hallways) {
        return false
    }

    console.log(`@main> Check connectivity: ${flag_connectivity}.`)
    console.log(`@main> Check treasures: ${flag_treasures}.`)
    console.log(`@main> Check monsters: ${flag_monsters}.`)
    console.log(`@main> Check hallways: ${falg_hallways}.`)

    return true
}

function getCombinations(m: number, n: number): number[][] {
    if (m > n) {
        return []
    }

    const result: number[][] = [];

    (function recursiveSelect(step: number, cur_combination: number[]) {
        if (cur_combination.length === m) {
            result.push(Array.from(cur_combination))
            return
        }

        if (step >= n) {
            return
        }

        cur_combination.push(step)
        recursiveSelect(step + 1, cur_combination)
        cur_combination.pop()

        if (cur_combination.length + (n - 1 - step) >= m) {
            recursiveSelect(step + 1, cur_combination)
        }
    })(0, [])

    return result
}

function dfs(step: number,
    cur_row_projection: MutableProjection, cur_column_projection: MutableProjection,
    handled_treasure_ids: number[], handled_monster_ids: number[],
    treasure_room_lt_coords: Coordinate[],
    diagram: Diagram,
    row_projection: Projection, column_projection: Projection,
    treasure_coords: readonly Coordinate[], monster_coords: readonly Coordinate[]): boolean {
    if (isSatisfiedProjections(cur_row_projection, cur_column_projection, row_projection, column_projection)) {
        return isSolved(treasure_coords, monster_coords, diagram)
    }

    // Enumerate treasures
    for (const treasure_coord of treasure_coords) {
        const x = treasure_coord.x
        const y = treasure_coord.y
        const hash_id = getHashId(x, y)

        if (!(diagram[x][y] === TileType.TREASURE &&
            !handled_treasure_ids.includes(hash_id))) {
            continue
        }

        let is_satisfied = false

        lroom_loop:
        for (const lt_coord of getTRoomLTCoords(x, y)) {
            if (!isTRoomLTCoordAvailable(lt_coord.x, lt_coord.y)) {
                continue lroom_loop
            }

            if (!isTRoomTilesAvailable(lt_coord.x, lt_coord.y, diagram)) {
                continue lroom_loop
            }

            const outer_tile_coords = getTRoomOuterTileCoords(lt_coord.x, lt_coord.y)
            const empty_space_coords = outer_tile_coords.filter(tile => diagram[tile.x][tile.y] === TileType.EMPTY_SPACE)

            for (const tile_coord of outer_tile_coords) {
                if (diagram[tile_coord.x][tile_coord.y] !== TileType.WALL &&
                    diagram[tile_coord.x][tile_coord.y] !== TileType.EMPTY_SPACE) {
                    continue lroom_loop
                }
            }

            if (empty_space_coords.length < 1) {
                return false
            } else {
                for (let i = 0; i < empty_space_coords.length; i += 1) {
                    let placed_indices: number[] = []

                    for (let j = 0; j < empty_space_coords.length; j += 1) {
                        if (j !== i) {
                            const row_i = empty_space_coords[j].x - 1
                            const column_i = empty_space_coords[j].y - 1

                            if (!isTilePlacable(row_i, column_i,
                                cur_row_projection, cur_column_projection, row_projection, column_projection)) {
                                break
                            }

                            diagram[empty_space_coords[j].x][empty_space_coords[j].y] = TileType.WALL
                            cur_row_projection[row_i] += 1
                            cur_column_projection[column_i] += 1
                            placed_indices.push(j)
                        }
                    }

                    if (placed_indices.length === empty_space_coords.length - 1 &&
                        checkTreasuresAndMonstersConnectivity(treasure_coords, monster_coords, diagram)) {
                        is_satisfied = true
                        handled_treasure_ids.push(hash_id)
                        treasure_room_lt_coords.push(lt_coord)

                        if (dfs(step + 1, cur_row_projection, cur_column_projection,
                            handled_treasure_ids, handled_monster_ids,
                            treasure_room_lt_coords,
                            diagram, row_projection, column_projection,
                            treasure_coords, monster_coords)) {
                            return true
                        }

                        handled_treasure_ids.pop()
                        treasure_room_lt_coords.pop()
                    }

                    for (let k = 0; k < placed_indices.length; k += 1) {
                        diagram[
                            empty_space_coords[placed_indices[k]].x
                        ][
                            empty_space_coords[placed_indices[k]].y] = TileType.EMPTY_SPACE
                        cur_row_projection[
                            empty_space_coords[placed_indices[k]].x - 1] -= 1
                        cur_column_projection[
                            empty_space_coords[placed_indices[k]].y - 1] -= 1
                    }
                }
            }
        }

        if (!is_satisfied) {
            return false
        }
    }

    if (handled_treasure_ids.length !== treasure_coords.length) {
        return false
    }

    // Enumerate monsters
    for (const monster_coord of monster_coords) {
        const x = monster_coord.x
        const y = monster_coord.y
        const hash_id = getHashId(x, y)

        if (!(diagram[x][y] === TileType.MONSTER &&
            !handled_monster_ids.includes(hash_id))) {
            continue
        }

        const outer_tile_coords = get4DirectionCoords(x, y)
        const empty_space_coords = outer_tile_coords.filter(tile => diagram[tile.x][tile.y] === TileType.EMPTY_SPACE)
        let number_of_walls = 0
        let is_satisfied = false

        for (const tile_coord of outer_tile_coords) {
            switch (diagram[tile_coord.x][tile_coord.y]) {
                case TileType.EMPTY_SPACE:
                    break
                case TileType.WALL:
                    number_of_walls += 1
                    break
                default:
                    return false
            }
        }

        if (number_of_walls >= 4) {
            return false
        } else {
            for (let i = 0; i < empty_space_coords.length; i += 1) {
                let placed_indices: number[] = []

                for (let j = 0; j < empty_space_coords.length; j += 1) {
                    if (j !== i) {
                        const row_i = empty_space_coords[j].x - 1
                        const column_i = empty_space_coords[j].y - 1

                        if (!isTilePlacable(row_i, column_i,
                            cur_row_projection, cur_column_projection, row_projection, column_projection)) {
                            break
                        }

                        diagram[empty_space_coords[j].x][empty_space_coords[j].y] = TileType.WALL
                        cur_row_projection[row_i] += 1
                        cur_column_projection[column_i] += 1
                        placed_indices.push(j)
                    }
                }

                if (placed_indices.length === empty_space_coords.length - 1 &&
                    checkTreasuresAndMonstersConnectivity(treasure_coords, monster_coords, diagram)) {
                    is_satisfied = true
                    handled_monster_ids.push(hash_id)

                    if (dfs(step + 1, cur_row_projection, cur_column_projection,
                        handled_treasure_ids, handled_monster_ids,
                        treasure_room_lt_coords,
                        diagram, row_projection, column_projection,
                        treasure_coords, monster_coords)) {
                        return true
                    }

                    handled_monster_ids.pop()
                }

                for (let k = 0; k < placed_indices.length; k += 1) {
                    diagram[
                        empty_space_coords[placed_indices[k]].x
                    ][
                        empty_space_coords[placed_indices[k]].y] = TileType.EMPTY_SPACE
                    cur_row_projection[
                        empty_space_coords[placed_indices[k]].x - 1] -= 1
                    cur_column_projection[
                        empty_space_coords[placed_indices[k]].y - 1] -= 1
                }
            }
        }

        if (!is_satisfied) {
            return false
        }
    }

    if (handled_monster_ids.length !== monster_coords.length) {
        return false
    }

    // Enumerate empty spaces
    for (let row_i = 0; row_i < cur_row_projection.length; row_i += 1) {
        const difference = row_projection[row_i] - cur_row_projection[row_i]

        if (difference <= 0) {
            continue
        }

        const available_coords: Coordinate[] = []

        for (let column_i = 0; column_i < cur_column_projection.length; column_i += 1) {
            if (cur_column_projection[column_i] >= column_projection[column_i]) {
                continue
            }

            const x = row_i + 1
            const y = column_i + 1

            if (!(diagram[x][y] === TileType.EMPTY_SPACE &&
                !isContainedByTRoom(x, y, treasure_room_lt_coords) &&
                isTilePlacable(row_i, column_i, cur_row_projection, cur_column_projection,
                    row_projection, column_projection))) {
                continue
            }

            diagram[x][y] = TileType.WALL
            cur_row_projection[row_i] += 1
            cur_column_projection[column_i] += 1

            if (checkTreasureRooms(treasure_coords, diagram) &&
                checkMonsters(monster_coords, diagram) &&
                checkTreasuresAndMonstersConnectivity(treasure_coords, monster_coords, diagram)) {
                available_coords.push({ x: x, y: y })
            }

            diagram[x][y] = TileType.EMPTY_SPACE
            cur_row_projection[row_i] -= 1
            cur_column_projection[column_i] -= 1
        }

        if (available_coords.length < difference) {
            return false
        }

        let is_satisfied = false

        for (const combination of getCombinations(difference, available_coords.length)) {
            for (const index of combination) {
                const x = available_coords[index].x
                const y = available_coords[index].y

                diagram[x][y] = TileType.WALL
                cur_row_projection[x - 1] += 1
                cur_column_projection[y - 1] += 1
            }

            if (checkTreasureRooms(treasure_coords, diagram) &&
                checkMonsters(monster_coords, diagram) &&
                checkTreasuresAndMonstersConnectivity(treasure_coords, monster_coords, diagram)) {
                is_satisfied = true
                if (dfs(step + 1, cur_row_projection, cur_column_projection,
                    handled_treasure_ids, handled_monster_ids,
                    treasure_room_lt_coords,
                    diagram, row_projection, column_projection,
                    treasure_coords, monster_coords)) {
                    return true
                }
            }

            for (const index of combination) {
                const x = available_coords[index].x
                const y = available_coords[index].y

                diagram[x][y] = TileType.EMPTY_SPACE
                cur_row_projection[x - 1] -= 1
                cur_column_projection[y - 1] -= 1
            }
        }

        if (!is_satisfied) {
            return false
        }
    }

    return false
}

function getTreasureAndMonsterCoords(diagram: Diagram): readonly [readonly Coordinate[], readonly Coordinate[]] {
    const treasure_coords: Coordinate[] = []
    const monster_coords: Coordinate[] = []

    for (let x = 1; x < SIDE_LENGTH - 1; x += 1) {
        for (let y = 1; y < SIDE_LENGTH - 1; y += 1) {
            switch (diagram[x][y]) {
                case TileType.TREASURE:
                    treasure_coords.push({ x: x, y: y })
                    break
                case TileType.MONSTER:
                    monster_coords.push({ x: x, y: y })
                    break
                default:
                    break
            }
        }
    }

    return [treasure_coords, monster_coords]
}

function getElapsedTime(start_time: number): number {
    return Math.abs((new Date()).getTime() - start_time)
}

function getFormattedTime(ms: number): string {
    return `${(ms / 1000).toFixed(2)}s`
}

(async () => {
    if (process.argv.length < 3) {
        console.log('@main> No argument of input provided.')
        return
    }

    const file_name = process.argv[2] ?? ""
    const parsing_result = await parseInputFile(file_name)

    if (parsing_result === null) {
        console.log(`@main> Failed to parse file "${file_name}".`)
        return
    }

    const [row_projection, column_projection, raw_diagram] = parsing_result
    const diagram = augmentRawDiagram(raw_diagram)
    const [treasure_coords, monster_coords] = getTreasureAndMonsterCoords(diagram)
    const cur_row_projection: MutableProjection = [0, 0, 0, 0, 0, 0, 0, 0]
    const cur_column_projection: MutableProjection = [0, 0, 0, 0, 0, 0, 0, 0]
    const start_time = (new Date()).getTime()

    if (!dfs(0, cur_row_projection, cur_column_projection,
        [], [], [],
        diagram, row_projection, column_projection,
        treasure_coords, monster_coords)) {
        console.log(`@main> (${getFormattedTime(getElapsedTime(start_time))}) Failed to find a solution.`)
        return
    }

    const ascii_diagram = getAsciiDiagram(diagram)

    console.log(`@main> (${getFormattedTime(getElapsedTime(start_time))}) Successed to find a solution:`)
    console.log(ascii_diagram)
    writeOutputFile(file_name, ascii_diagram)
})();
