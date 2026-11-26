export const EBML_HEADER = 0x1a_45_df_a3;
export const EBML_SEGMENT = 0x18_53_80_67;
export const EBML_INFO = 0x15_49_a9_66;
export const EBML_TIMECODE_SCALE = 0x2a_d7_b1;
export const EBML_DURATION = 0x44_89;
export const EBML_CLUSTER = 0x1f_43_b6_75;
export const EBML_TIMECODE = 0xe7;

const DEFAULT_TIMECODE_SCALE = 1_000_000;

export interface Vint {
  value: number;
  length: number;
  unknown: boolean;
}

/** An EBML variable-length integer; ids keep their length-marker bit, sizes drop it. */
export const readVint = (bytes: Uint8Array, at: number, id: boolean) => {
  const first = bytes[at];

  if (first === undefined || first === 0) {
    return null;
  }

  const length = Math.clz32(first) - 23;

  if (at + length > bytes.length) {
    return null;
  }

  const marker = 2 ** (8 - length);
  const payload = first % marker;
  let value = id ? first : payload;
  let unknown = payload === marker - 1;

  for (let k = 1; k < length; k += 1) {
    const byte = bytes[at + k] ?? 0;
    value = value * 256 + byte;

    if (byte !== 0xff) {
      unknown = false;
    }
  }

  return { length, unknown: !id && unknown, value } satisfies Vint | null;
};

export const readUint = (bytes: Uint8Array, at: number, length: number) => {
  let value = 0;

  for (let k = 0; k < length; k += 1) {
    value = value * 256 + (bytes[at + k] ?? 0);
  }

  return value;
};

const writeSize8 = (target: Uint8Array, at: number, value: number) => {
  target[at] = 0x01;
  let rest = value;

  for (let k = 7; k >= 1; k -= 1) {
    target[at + k] = rest % 256;
    rest = Math.floor(rest / 256);
  }
};

const encodeSize = (value: number) => {
  let length = 1;

  while (value >= 2 ** (7 * length) - 1) {
    length += 1;
  }

  const out = new Uint8Array(length);
  let rest = value;

  for (let k = length - 1; k >= 1; k -= 1) {
    out[k] = rest % 256;
    rest = Math.floor(rest / 256);
  }

  out[0] = 2 ** (8 - length) + rest;

  return out;
};

interface Element {
  at: number;
  body: number;
  size: number;
}

const timecodeScaleOf = (bytes: Uint8Array, info: Element) => {
  let cursor = info.body;

  while (cursor < info.body + info.size) {
    const id = readVint(bytes, cursor, true);

    if (id === null) {
      break;
    }

    const size = readVint(bytes, cursor + id.length, false);

    if (size === null || size.unknown) {
      break;
    }

    const body = cursor + id.length + size.length;

    if (id.value === EBML_TIMECODE_SCALE) {
      return readUint(bytes, body, size.value);
    }

    cursor = body + size.value;
  }

  return DEFAULT_TIMECODE_SCALE;
};

const findSegment = (bytes: Uint8Array) => {
  const header = readVint(bytes, 0, true);

  if (header === null || header.value !== EBML_HEADER) {
    return null;
  }

  const headerSize = readVint(bytes, header.length, false);

  if (headerSize === null || headerSize.unknown) {
    return null;
  }

  const segmentAt = header.length + headerSize.length + headerSize.value;
  const segment = readVint(bytes, segmentAt, true);

  if (segment === null || segment.value !== EBML_SEGMENT) {
    return null;
  }

  const segmentSize = readVint(bytes, segmentAt + segment.length, false);

  if (segmentSize === null || segmentSize.length !== 8) {
    return null;
  }

  const segmentSizeAt = segmentAt + segment.length;

  return { segmentBody: segmentSizeAt + segmentSize.length, segmentSizeAt } satisfies {
    segmentSizeAt: number;
    segmentBody: number;
  } | null;
};

/**
 * A recorder's stream as a file. MediaRecorder writes for a stream that may
 * never end: the Segment and every Cluster carry the "unknown size" marker
 * and Info has no Duration — fine for MediaSource, which appends as it goes,
 * and not for a `<video src>`: Safari refuses it and Chrome cannot seek it.
 * The sizes are filled in and a Duration written into Info. Nothing in such
 * a stream refers to a byte offset, so Info may grow. A stream that does not
 * parse comes back untouched.
 */
export const finalizeWebm = (bytes: Uint8Array<ArrayBuffer>, durationSeconds: number) => {
  const found = findSegment(bytes);

  if (found === null) {
    return bytes;
  }

  const { segmentSizeAt, segmentBody } = found;

  const out = new Uint8Array(bytes);
  let info: Element | undefined;
  let cluster: { sizeAt: number; body: number } | undefined;
  let cursor = segmentBody;

  while (cursor < bytes.length) {
    const id = readVint(bytes, cursor, true);

    if (id === null) {
      return bytes;
    }

    const size = readVint(bytes, cursor + id.length, false);

    if (size === null) {
      return bytes;
    }

    const body = cursor + id.length + size.length;

    if (id.value === EBML_CLUSTER) {
      if (cluster !== undefined) {
        writeSize8(out, cluster.sizeAt, cursor - cluster.body);
      }

      if (size.unknown && size.length === 8) {
        cluster = { body, sizeAt: cursor + id.length };
        cursor = body;
      } else if (size.unknown) {
        return bytes;
      } else {
        cluster = undefined;
        cursor = body + size.value;
      }

      continue;
    }

    if (size.unknown) {
      return bytes;
    }

    if (id.value === EBML_INFO) {
      info = { at: cursor, body, size: size.value };
    }

    cursor = body + size.value;
  }

  if (cluster !== undefined) {
    writeSize8(out, cluster.sizeAt, bytes.length - cluster.body);
  }

  if (info === undefined) {
    writeSize8(out, segmentSizeAt, bytes.length - segmentBody);

    return out;
  }

  const duration = new Uint8Array(2 + 1 + 8);
  duration.set([0x44, 0x89, 0x88]);
  new DataView(duration.buffer).setFloat64(
    3,
    (durationSeconds * 1e9) / timecodeScaleOf(bytes, info),
  );
  const infoIdLength = 4;
  const oldSizeLength = info.body - info.at - infoIdLength;
  const newSize = encodeSize(info.size + duration.length);
  const grown = duration.length + (newSize.length - oldSizeLength);
  writeSize8(out, segmentSizeAt, bytes.length - segmentBody + grown);

  const result = new Uint8Array(bytes.length + grown);
  let at = 0;

  const append = (part: Uint8Array) => {
    result.set(part, at);
    at += part.length;
  };

  append(out.subarray(0, info.at + infoIdLength));
  append(newSize);
  append(out.subarray(info.body, info.body + info.size));
  append(duration);
  append(out.subarray(info.body + info.size));

  return result;
};
