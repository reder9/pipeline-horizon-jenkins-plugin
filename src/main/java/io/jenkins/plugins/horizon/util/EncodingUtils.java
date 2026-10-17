package io.jenkins.plugins.horizon.util;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility functions for character encoding detection, repair, and normalization.
 */
public final class EncodingUtils {

    private static final Pattern MOJIBAKE_PATTERN = Pattern.compile(
            "([\\u00C2-\\u00F4][\\u0080-\\u00BF\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6\\u2030\\u0160\\u2039\\u0152\\u017D\\u2018\\u2019\\u201C\\u201D\\u2022\\u2013\\u2014\\u02DC\\u2122\\u0161\\u203A\\u0153\\u017E\\u0178]+)"
    );

    private EncodingUtils() {
        // Prevent instantiation of utility class
    }

    /**
     * Maps an ISO-8859-1 or Windows-1252 character to its raw byte representation (0-255).
     *
     * @param c the character to map
     * @return the byte value (0..255) or -1 if the character is outside CP1252 / ISO-8859-1
     */
    private static int cp1252ToByte(char c) {
        if (c < 256) {
            return (int) c;
        }
        switch (c) {
            case '\u20AC': return 0x80;
            case '\u201A': return 0x82;
            case '\u0192': return 0x83;
            case '\u201E': return 0x84;
            case '\u2026': return 0x85;
            case '\u2020': return 0x86;
            case '\u2021': return 0x87;
            case '\u02C6': return 0x88;
            case '\u2030': return 0x89;
            case '\u0160': return 0x8A;
            case '\u2039': return 0x8B;
            case '\u0152': return 0x8C;
            case '\u017D': return 0x8E;
            case '\u2018': return 0x91;
            case '\u2019': return 0x92;
            case '\u201C': return 0x93;
            case '\u201D': return 0x94;
            case '\u2022': return 0x95;
            case '\u2013': return 0x96;
            case '\u2014': return 0x97;
            case '\u02DC': return 0x98;
            case '\u2122': return 0x99;
            case '\u0161': return 0x9A;
            case '\u203A': return 0x9B;
            case '\u0153': return 0x9C;
            case '\u017E': return 0x9E;
            case '\u0178': return 0x9F;
            default: return -1;
        }
    }

    /**
     * Detects and repairs mojibake strings where UTF-8 sequences (such as emojis or
     * multi-byte Unicode characters) were incorrectly interpreted as ISO-8859-1 or Windows-1252.
     * <p>
     * Strings that are pure ASCII or already valid UTF-8 are passed through without modification.
     *
     * @param input the input string which may contain corrupted / mojibake characters
     * @return the repaired string with clean UTF-8 characters, or the original string if clean/unrepairable
     */
    public static String fixMojibake(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        // Fast scan: check for any lead byte character candidate (0xC2 to 0xF4)
        boolean hasCandidate = false;
        int len = input.length();
        for (int i = 0; i < len; i++) {
            char c = input.charAt(i);
            if (c >= '\u00C2' && c <= '\u00F4') {
                hasCandidate = true;
                break;
            }
        }

        if (!hasCandidate) {
            return input;
        }

        Matcher matcher = MOJIBAKE_PATTERN.matcher(input);
        StringBuffer sb = null;

        while (matcher.find()) {
            String chunk = matcher.group(1);
            byte[] bytes = new byte[chunk.length()];
            boolean validBytes = true;

            for (int i = 0; i < chunk.length(); i++) {
                int b = cp1252ToByte(chunk.charAt(i));
                if (b < 0) {
                    validBytes = false;
                    break;
                }
                bytes[i] = (byte) b;
            }

            if (!validBytes) {
                continue;
            }

            try {
                CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT);
                CharBuffer decoded = decoder.decode(ByteBuffer.wrap(bytes));
                String replacement = decoded.toString();

                if (sb == null) {
                    sb = new StringBuffer(len);
                }
                matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
            } catch (CharacterCodingException ignored) {
                // Not a valid UTF-8 byte sequence; leave as is
            }
        }

        if (sb == null) {
            return input;
        }

        matcher.appendTail(sb);
        return sb.toString();
    }
}
