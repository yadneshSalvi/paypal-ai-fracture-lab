from __future__ import annotations
import base64
import binascii
from collections.abc import Callable
from dataclasses import dataclass
from functools import partial
from typing import Annotated, Any, Final, Literal, TypeAlias
from pydantic import Field
from pydantic.functional_serializers import PlainSerializer
from pydantic.functional_validators import BeforeValidator
ByteEncodingName: TypeAlias = Literal['base64', 'base64url', 'base32', 'base32hex', 'base16']
ByteCharset: TypeAlias = Literal['ascii', 'utf-8', 'latin-1', 'cp1252']

@dataclass(frozen=True, slots=True)
class ByteEncodingConverter:
    name: str
    decode: Callable[[str], bytes]
    encode: Callable[[bytes], bytes]

    def parse(self, value: object) -> object:
        ...

    def dump(self, value: bytes | None, charset: ByteCharset) -> str | None:
        ...
BASE64: Final = ByteEncodingConverter(name='BASE64', decode=lambda text: base64.b64decode(text, validate=True), encode=base64.b64encode)
BASE64URL: Final = ByteEncodingConverter(name='BASE64URL', decode=lambda text: base64.b64decode(text, altchars=b'-_', validate=True), encode=base64.urlsafe_b64encode)
BASE32: Final = ByteEncodingConverter(name='BASE32', decode=lambda text: base64.b32decode(text, casefold=True), encode=base64.b32encode)
BASE32HEX: Final = ByteEncodingConverter(name='BASE32HEX', decode=lambda text: base64.b32hexdecode(text, casefold=True), encode=base64.b32hexencode)
BASE16: Final = ByteEncodingConverter(name='BASE16', decode=lambda text: base64.b16decode(text, casefold=True), encode=base64.b16encode)
_CODECS: Final[dict[ByteEncodingName, ByteEncodingConverter]] = {'base64': BASE64, 'base64url': BASE64URL, 'base32': BASE32, 'base32hex': BASE32HEX, 'base16': BASE16}

def ByteField(*, encoding: ByteEncodingName='base64', charset: ByteCharset='utf-8', alias: str | None=None, description: str | None=None, default: Any=...) -> Any:
    ...
Base64AsciiEncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64.parse), PlainSerializer(partial(BASE64.dump, charset='ascii'), return_type=str)]
Base64Utf8EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64.parse), PlainSerializer(partial(BASE64.dump, charset='utf-8'), return_type=str)]
Base64Latin1EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64.parse), PlainSerializer(partial(BASE64.dump, charset='latin-1'), return_type=str)]
Base64Cp1252EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64.parse), PlainSerializer(partial(BASE64.dump, charset='cp1252'), return_type=str)]
Base64UrlAsciiEncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64URL.parse), PlainSerializer(partial(BASE64URL.dump, charset='ascii'), return_type=str)]
Base64UrlUtf8EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64URL.parse), PlainSerializer(partial(BASE64URL.dump, charset='utf-8'), return_type=str)]
Base64UrlLatin1EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64URL.parse), PlainSerializer(partial(BASE64URL.dump, charset='latin-1'), return_type=str)]
Base64UrlCp1252EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE64URL.parse), PlainSerializer(partial(BASE64URL.dump, charset='cp1252'), return_type=str)]
Base32AsciiEncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32.parse), PlainSerializer(partial(BASE32.dump, charset='ascii'), return_type=str)]
Base32Utf8EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32.parse), PlainSerializer(partial(BASE32.dump, charset='utf-8'), return_type=str)]
Base32Latin1EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32.parse), PlainSerializer(partial(BASE32.dump, charset='latin-1'), return_type=str)]
Base32Cp1252EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32.parse), PlainSerializer(partial(BASE32.dump, charset='cp1252'), return_type=str)]
Base32HexAsciiEncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32HEX.parse), PlainSerializer(partial(BASE32HEX.dump, charset='ascii'), return_type=str)]
Base32HexUtf8EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32HEX.parse), PlainSerializer(partial(BASE32HEX.dump, charset='utf-8'), return_type=str)]
Base32HexLatin1EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32HEX.parse), PlainSerializer(partial(BASE32HEX.dump, charset='latin-1'), return_type=str)]
Base32HexCp1252EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE32HEX.parse), PlainSerializer(partial(BASE32HEX.dump, charset='cp1252'), return_type=str)]
Base16AsciiEncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE16.parse), PlainSerializer(partial(BASE16.dump, charset='ascii'), return_type=str)]
Base16Utf8EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE16.parse), PlainSerializer(partial(BASE16.dump, charset='utf-8'), return_type=str)]
Base16Latin1EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE16.parse), PlainSerializer(partial(BASE16.dump, charset='latin-1'), return_type=str)]
Base16Cp1252EncodedBytes: TypeAlias = Annotated[bytes, BeforeValidator(BASE16.parse), PlainSerializer(partial(BASE16.dump, charset='cp1252'), return_type=str)]
